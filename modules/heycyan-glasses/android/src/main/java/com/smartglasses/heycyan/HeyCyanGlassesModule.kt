package com.smartglasses.heycyan

import android.app.Application
import android.bluetooth.BluetoothDevice
import android.bluetooth.le.ScanResult
import android.util.Base64
import android.util.Log
import androidx.core.os.bundleOf
import com.oudmon.ble.base.bluetooth.BleOperateManager
import com.oudmon.ble.base.bluetooth.DeviceManager
import com.oudmon.ble.base.communication.ILargeDataResponse
import com.oudmon.ble.base.communication.LargeDataHandler
import com.oudmon.ble.base.communication.bigData.resp.GlassesDeviceNotifyRsp
import com.oudmon.ble.base.communication.bigData.resp.GlassModelControlResponse
import com.oudmon.ble.base.scan.BleScannerHelper
import com.oudmon.ble.base.scan.ScanRecord
import com.oudmon.ble.base.scan.ScanWrapperCallback
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean

class HeyCyanGlassesModule : Module() {
  private val tag = "HeyCyanGlasses"
  private val initialized = AtomicBoolean(false)
  private val waitingForPhotoTransfer = AtomicBoolean(false)
  private val photoDelivered = AtomicBoolean(false)
  private val jsListenersActive = AtomicBoolean(false)
  private val notifyListenerKey = 0x4843

  override fun definition() = ModuleDefinition {
    Name("HeyCyanGlasses")

    Events(
      "onDeviceDiscovered",
      "onDeviceConnected",
      "onDeviceDisconnected",
      "onBatteryUpdate",
      "onMediaCountsUpdate",
      "onPhotoReceived",
      "onCaptureStatus",
      "onAIImageReceived",
      "onSdkLog",
      "onBluetoothStateChanged",
      "onScanResult",
      "onConnecting",
      "onConnected",
      "onDisconnected",
      "onMediaUpdate",
      "onPhotoStarted",
      "onPhotoCompleted",
      "onPhotoFailed",
      "onSdkError",
      "onError"
    )

    OnStartObserving {
      jsListenersActive.set(true)
      Log.d(tag, "JS event listeners active")
    }

    OnStopObserving {
      jsListenersActive.set(false)
      Log.d(tag, "JS event listeners inactive")
    }

    AsyncFunction("initialize") {
      val app = application()
      sdkLog("initialize(): application=${app.packageName}")
      BleOperateManager.getInstance(app)
      LargeDataHandler.getInstance().initEnable()
      registerGlassesNotifyListener()
      initialized.set(true)
      sdkLog("initialize(): initEnable and notify listener registered")
      true
    }

    AsyncFunction("connect") { deviceId: String ->
      ensureInitialized()
      sdkLog("connect(): deviceId=$deviceId")
      sendEvent("onConnecting", bundleOf("id" to deviceId))
      DeviceManager.getInstance().deviceAddress = deviceId
      BleOperateManager.getInstance().connectDirectly(deviceId)
      waitForConnection()
    }

    AsyncFunction("disconnect") {
      sdkLog("disconnect()")
      BleOperateManager.getInstance().disconnect()
      waitingForPhotoTransfer.set(false)
      sendEvent("onDeviceDisconnected", bundleOf("deviceId" to DeviceManager.getInstance().deviceAddress))
      sendEvent("onDisconnected", bundleOf("deviceId" to DeviceManager.getInstance().deviceAddress))
      true
    }

    AsyncFunction("isConnected") {
      val connected = BleOperateManager.getInstance().isConnected
      val ready = BleOperateManager.getInstance().isReady
      sdkLog("isConnected(): connected=$connected ready=$ready; capture only requires connected")
      connected
    }

    AsyncFunction("takePhoto") {
      ensureInitialized()
      val connected = BleOperateManager.getInstance().isConnected
      val ready = BleOperateManager.getInstance().isReady
      sdkLog("takePhoto(): connected=$connected ready=$ready")
      sendCaptureStatus("preflight", "connected=$connected ready=$ready")

      if (!connected) {
        sendError("Cannot take photo: SDK BLE session is not connected")
        false
      } else {
        waitingForPhotoTransfer.set(true)
        photoDelivered.set(false)
        sendEvent("onPhotoStarted", bundleOf("timestamp" to System.currentTimeMillis()))
        sendCaptureStatus("command", "Sending glassesControl [0x02, 0x01, 0x01]")
        LargeDataHandler.getInstance().glassesControl(byteArrayOf(0x02, 0x01, 0x01)) { cmdType, response ->
          handleCaptureResponse(cmdType, response)
        }
        true
      }
    }

    AsyncFunction("getBattery") {
      ensureInitialized()
      sdkLog("getBattery(): requesting battery sync")
      LargeDataHandler.getInstance().addBatteryCallBack("react-native") { _, response ->
        if (response != null) {
          val payload = bundleOf(
            "level" to response.battery,
            "isCharging" to response.isCharging
          )
          sdkLog("onBatteryUpdate: $payload")
          sendEvent("onBatteryUpdate", payload)
        }
      }
      LargeDataHandler.getInstance().syncBattery()
      bundleOf("level" to 0, "isCharging" to false)
    }

    AsyncFunction("getMediaCounts") {
      ensureInitialized()
      sdkLog("getMediaCounts(): sending glassesControl [0x02, 0x04]")
      LargeDataHandler.getInstance().glassesControl(byteArrayOf(0x02, 0x04)) { _, response ->
        if (response.dataType == 4) {
          val payload = bundleOf(
            "photos" to response.imageCount,
            "videos" to response.videoCount,
            "audios" to response.recordCount
          )
          sdkLog("onMediaCountsUpdate: $payload")
          sendEvent("onMediaCountsUpdate", payload)
          sendEvent("onMediaUpdate", payload)
        }
      }
      bundleOf("photos" to 0, "videos" to 0, "audios" to 0)
    }

    AsyncFunction("syncTime") {
      ensureInitialized()
      sdkLog("syncTime()")
      LargeDataHandler.getInstance().syncTime { cmdType, response ->
        sdkLog("syncTime response: cmdType=$cmdType response=$response")
      }
      true
    }

    AsyncFunction("getVersionInfo") {
      ensureInitialized()
      sdkLog("getVersionInfo()")
      LargeDataHandler.getInstance().syncDeviceInfo { _, response ->
        sdkLog("getVersionInfo response: $response")
      }
      bundleOf("hardware" to "", "firmware" to "", "wifiHardware" to "", "wifiFirmware" to "")
    }

    AsyncFunction("enableNotifications") {
      ensureInitialized()
      LargeDataHandler.getInstance().initEnable()
      registerGlassesNotifyListener()
      sdkLog("enableNotifications(): initEnable and out-device listener registered")
      bundleOf(
        "initialized" to initialized.get(),
        "connected" to BleOperateManager.getInstance().isConnected,
        "ready" to BleOperateManager.getInstance().isReady,
        "deviceAddress" to DeviceManager.getInstance().deviceAddress,
        "respMapKeys" to LargeDataHandler.getInstance().respMap.keys.joinToString(","),
        "noClearMapKeys" to LargeDataHandler.getInstance().noClearMap.keys.joinToString(",")
      )
    }

    AsyncFunction("dumpSdkState") {
      ensureInitialized()
      val payload = bundleOf(
        "initialized" to initialized.get(),
        "connected" to BleOperateManager.getInstance().isConnected,
        "ready" to BleOperateManager.getInstance().isReady,
        "deviceAddress" to DeviceManager.getInstance().deviceAddress,
        "waitingForPhotoTransfer" to waitingForPhotoTransfer.get(),
        "photoDelivered" to photoDelivered.get(),
        "respMapKeys" to LargeDataHandler.getInstance().respMap.keys.joinToString(","),
        "noClearMapKeys" to LargeDataHandler.getInstance().noClearMap.keys.joinToString(",")
      )
      sdkLog("dumpSdkState(): $payload")
      payload
    }

    AsyncFunction("startScan") {
      ensureInitialized()
      sdkLog("startScan(): SDK scanner requested")
      startSdkScan()
      true
    }

    AsyncFunction("stopScan") {
      sdkLog("stopScan(): SDK scanner requested")
      BleScannerHelper.getInstance().stopScan(application())
      true
    }

    AsyncFunction("startVideo") { false }
    AsyncFunction("stopVideo") { false }
    AsyncFunction("startAudio") { false }
    AsyncFunction("stopAudio") { false }
    AsyncFunction("generateAIPhoto") { false }
  }

  private fun application(): Application {
    return appContext.reactContext?.applicationContext as? Application
      ?: throw IllegalStateException("React application context is not available")
  }

  private fun ensureInitialized() {
    if (!initialized.get()) {
      sdkLog("ensureInitialized(): lazy initialize")
      BleOperateManager.getInstance(application())
      LargeDataHandler.getInstance().initEnable()
      registerGlassesNotifyListener()
      initialized.set(true)
    }
  }

  private fun registerGlassesNotifyListener() {
    sdkLog("registerGlassesNotifyListener(): key=$notifyListenerKey")
    LargeDataHandler.getInstance().addOutDeviceListener(
      notifyListenerKey,
      object : ILargeDataResponse<GlassesDeviceNotifyRsp> {
        override fun parseData(cmdType: Int, response: GlassesDeviceNotifyRsp) {
          handleGlassesNotify(cmdType, response)
        }
      }
    )
  }

  private fun startSdkScan() {
    val app = application()
    sdkLog("[SDK] Scan Started")
    BleScannerHelper.getInstance().reSetCallback()
    BleScannerHelper.getInstance().scanDevice(
      app,
      null as UUID?,
      object : ScanWrapperCallback {
        override fun onStart() {
          sdkLog("SDK scan callback onStart")
          sendEvent("onBluetoothStateChanged", bundleOf("state" to "scan_started"))
        }

        override fun onStop() {
          sdkLog("SDK scan callback onStop")
          sendEvent("onBluetoothStateChanged", bundleOf("state" to "scan_stopped"))
        }

        override fun onLeScan(device: BluetoothDevice, rssi: Int, scanRecord: ByteArray) {
          emitScanResult(device, rssi, scanRecord)
        }

        override fun onScanFailed(errorCode: Int) {
          val message = "SDK scan failed: $errorCode"
          sdkLog(message, "error")
          sendEvent("onSdkError", bundleOf("message" to message, "code" to errorCode))
        }

        override fun onParsedData(device: BluetoothDevice, scanRecord: ScanRecord) {
          sdkLog("SDK scan parsed data: ${device.name} ${device.address}")
        }

        override fun onBatchScanResults(results: MutableList<ScanResult>) {
          results.forEach { result ->
            emitScanResult(result.device, result.rssi, result.scanRecord?.bytes ?: byteArrayOf())
          }
        }
      }
    )
  }

  private fun emitScanResult(device: BluetoothDevice, rssi: Int, scanRecord: ByteArray) {
    val payload = bundleOf(
      "id" to device.address,
      "name" to (device.name ?: ""),
      "rssi" to rssi,
      "scanRecordHex" to scanRecord.joinToString(" ") { "%02X".format(it) }
    )
    sdkLog("[SDK] Device Found ${device.name ?: ""} ${device.address} rssi=$rssi")
    sendEvent("onDeviceDiscovered", payload)
    sendEvent("onScanResult", payload)
  }

  private fun waitForConnection(): Boolean {
    repeat(20) { attempt ->
      val connected = BleOperateManager.getInstance().isConnected
      val ready = BleOperateManager.getInstance().isReady
      sdkLog("connect poll ${attempt + 1}: connected=$connected ready=$ready")
      if (connected) {
        val payload = bundleOf("id" to DeviceManager.getInstance().deviceAddress, "name" to DeviceManager.getInstance().deviceName)
        sdkLog("[SDK] Connected ${DeviceManager.getInstance().deviceAddress}")
        sendEvent("onDeviceConnected", payload)
        sendEvent("onConnected", payload)
        return true
      }
      Thread.sleep(250)
    }

    val connected = BleOperateManager.getInstance().isConnected
    sdkLog("connect finished: connected=$connected ready=${BleOperateManager.getInstance().isReady}")
    if (!connected) {
      sendEvent("onSdkError", bundleOf("message" to "SDK connect timeout", "deviceId" to DeviceManager.getInstance().deviceAddress))
    }
    return connected
  }

  private fun handleCaptureResponse(cmdType: Int, response: GlassModelControlResponse) {
    val message = "cmdType=$cmdType dataType=${response.dataType} errorCode=${response.errorCode} workType=${response.workTypeIng} photos=${response.imageCount} videos=${response.videoCount} audios=${response.recordCount} p2pIp=${response.p2pIp}"
    sdkLog("takePhoto response: $message")
    sendCaptureStatus("response", message)

    when (response.dataType) {
      1 -> {
        if (response.errorCode != 0) {
          waitingForPhotoTransfer.set(false)
          sendError("Photo command failed: $message")
          sendEvent("onPhotoFailed", bundleOf("message" to message, "errorCode" to response.errorCode))
          return
        }

        sendCaptureStatus("captured", "Photo clicked on glasses")
        sendEvent("onPhotoCompleted", bundleOf("message" to "Photo clicked on glasses"))
      }
      3 -> {
        if (!response.p2pIp.isNullOrBlank()) {
          downloadLatestPhoto(response.p2pIp)
        }
        return
      }
      4 -> {
        sendEvent("onMediaCountsUpdate", bundleOf(
          "photos" to response.imageCount,
          "videos" to response.videoCount,
          "audios" to response.recordCount
        ))
        sendEvent("onMediaUpdate", bundleOf(
          "photos" to response.imageCount,
          "videos" to response.videoCount,
          "audios" to response.recordCount
        ))
        return
      }
    }

    if (response.p2pIp.isNullOrBlank()) {
      sendCaptureStatus("download", "No p2pIp returned; full-resolution download can be handled later")
    } else {
      downloadLatestPhoto(response.p2pIp)
    }

    requestPictureThumbnailsWithRetry()
  }

  private fun handleGlassesNotify(cmdType: Int, response: GlassesDeviceNotifyRsp) {
    val data = response.loadData ?: return
    val hex = data.joinToString(" ") { "%02X".format(it) }
    sdkLog("glasses notify: cmdType=$cmdType bytes=${data.size} data=$hex")

    val p2pIp = extractP2pIp(data) ?: run {
      return
    }

    sendCaptureStatus("download", "Received P2P IP from glasses notify: $p2pIp")
    downloadLatestPhoto(p2pIp)
  }

  private fun extractP2pIp(data: ByteArray): String? {
    val ipByteIndexes = when {
      data.size > 13 && data[7].toInt() == 3 -> listOf(10, 11, 12, 13)
      data.size > 7 && data[1].toInt() == 3 -> listOf(4, 5, 6, 7)
      else -> return null
    }

    return ipByteIndexes.joinToString(".") { index ->
      (data[index].toInt() and 0xFF).toString()
    }
  }

  private fun requestPictureThumbnailsWithRetry(attempt: Int = 1) {
    sendCaptureStatus("thumbnail", "Requesting picture thumbnail attempt $attempt")
    LargeDataHandler.getInstance().getPictureThumbnails { thumbnailCmdType, success, data ->
      val byteCount = data?.size ?: 0
      sdkLog("thumbnail response: attempt=$attempt cmdType=$thumbnailCmdType success=$success bytes=$byteCount")
      sendCaptureStatus("thumbnail", "attempt=$attempt cmdType=$thumbnailCmdType success=$success bytes=$byteCount")

      if (success && data != null && data.isNotEmpty()) {
        deliverPhoto("heycyan_${System.currentTimeMillis()}", data)
        return@getPictureThumbnails
      }

      if (attempt < 3 && waitingForPhotoTransfer.get()) {
        Thread {
          Thread.sleep(3000)
          requestPictureThumbnailsWithRetry(attempt + 1)
        }.start()
      }
    }
  }

  private fun sendCaptureStatus(stage: String, message: String) {
    sdkLog("capture status: $stage - $message")
    sendEvent("onCaptureStatus", bundleOf("stage" to stage, "message" to message))
  }

  private fun sendError(message: String) {
    Log.e(tag, message)
    sdkLog("error: $message", "error")
    sendEvent("onSdkError", bundleOf("message" to message))
    sendEvent("onError", bundleOf("message" to message))
  }

  private fun sdkLog(message: String, level: String = "info") {
    if (level == "error") {
      Log.e(tag, message)
    } else {
      Log.d(tag, message)
    }
    if (jsListenersActive.get()) {
      sendEvent("onSdkLog", bundleOf(
        "level" to level,
        "message" to message,
        "timestamp" to System.currentTimeMillis()
      ))
    }
  }

  private fun deliverPhoto(photoId: String, photoBytes: ByteArray) {
    if (!photoDelivered.compareAndSet(false, true)) {
      sendCaptureStatus("photo", "Ignoring duplicate photo callback for $photoId")
      return
    }

    waitingForPhotoTransfer.set(false)
    sendEvent("onPhotoReceived", bundleOf(
      "photoId" to photoId,
      "photoBase64" to Base64.encodeToString(photoBytes, Base64.NO_WRAP)
    ))
  }

  private fun downloadLatestPhoto(deviceIp: String) {
    Thread {
      try {
        val normalizedIp = deviceIp.removePrefix("http://").removePrefix("https://").substringBefore("/")
        val baseUrl = "http://$normalizedIp/files"
        sendCaptureStatus("download", "Fetching media list from $baseUrl/media.config")

        val mediaConfig = httpGet("$baseUrl/media.config").decodeToString()
        val jpgFiles = mediaConfig
          .lineSequence()
          .map { it.trim() }
          .filter { it.endsWith(".jpg", ignoreCase = true) || it.endsWith(".jpeg", ignoreCase = true) }
          .toList()

        sdkLog("downloadLatestPhoto(): jpgFiles=$jpgFiles")
        if (jpgFiles.isEmpty()) {
          sendCaptureStatus("download", "media.config returned no JPG files")
          return@Thread
        }

        val fileName = jpgFiles.last()
        sendCaptureStatus("download", "Downloading latest JPG: $fileName")
        val photoBytes = httpGet("$baseUrl/$fileName")
        deliverPhoto(fileName.substringBeforeLast('.', "heycyan_${System.currentTimeMillis()}"), photoBytes)
      } catch (error: Throwable) {
        Log.e(tag, "downloadLatestPhoto failed: ${error.message}", error)
        sdkLog("downloadLatestPhoto failed: ${error.message}", "error")
        sendCaptureStatus("download-error", error.message ?: "Unknown download error")
      }
    }.start()
  }

  private fun httpGet(url: String): ByteArray {
    val connection = (URL(url).openConnection() as HttpURLConnection).apply {
      requestMethod = "GET"
      connectTimeout = 10000
      readTimeout = 30000
    }
    return try {
      val responseCode = connection.responseCode
      if (responseCode != HttpURLConnection.HTTP_OK) {
        throw IllegalStateException("HTTP $responseCode for $url")
      }
      connection.inputStream.use { it.readBytes() }
    } finally {
      connection.disconnect()
    }
  }
}
