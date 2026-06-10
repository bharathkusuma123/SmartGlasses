package com.smartglasses.heycyan

import android.app.Application
import android.bluetooth.BluetoothDevice
import android.bluetooth.le.ScanResult
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.util.Base64
import android.util.Log
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import androidx.core.os.bundleOf
import com.oudmon.ble.base.bluetooth.BleOperateManager
import com.oudmon.ble.base.bluetooth.DeviceManager
import com.oudmon.ble.base.bluetooth.OnGattEventCallback
import com.oudmon.ble.base.communication.ILargeDataResponse
import com.oudmon.ble.base.communication.LargeDataHandler
import com.oudmon.ble.base.communication.bigData.resp.BatteryResponse
import com.oudmon.ble.base.communication.bigData.resp.DeviceInfoResponse
import com.oudmon.ble.base.communication.bigData.resp.GlassesDeviceNotifyRsp
import com.oudmon.ble.base.communication.bigData.resp.GlassModelControlResponse
import com.oudmon.ble.base.communication.bigData.resp.SyncTimeResponse
import com.oudmon.ble.base.scan.BleScannerHelper
import com.oudmon.ble.base.scan.ScanRecord
import com.oudmon.ble.base.scan.ScanWrapperCallback
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

class HeyCyanGlassesModule : Module() {
  private val tag = "HeyCyanGlasses"
  private val initialized = AtomicBoolean(false)
  private val sdkCoreInitialized = AtomicBoolean(false)
  private val sdkReceiversRegistered = AtomicBoolean(false)
  private val serviceDiscovered = AtomicBoolean(false)
  private val characteristicsDiscovered = AtomicBoolean(false)
  private val notificationsEnabled = AtomicBoolean(false)
  private val largeDataEnableRequested = AtomicBoolean(false)
  private val largeDataNotificationsEnabled = AtomicBoolean(false)
  private val timeSynced = AtomicBoolean(false)
  private val waitingForPhotoTransfer = AtomicBoolean(false)
  private val photoDelivered = AtomicBoolean(false)
  private val jsListenersActive = AtomicBoolean(false)
  private val notifyListenerKey = 0x4843

  private val actionGattConnected = "com.swatchdevice.pro.sdk.ble.gatt_connected"
  private val actionGattDisconnected = "com.swatchdevice.pro.sdk.ble.gatt_disconnected"
  private val actionServiceDiscovered = "com.swatchdevice.pro.sdk.ble.service_discovered"
  private val actionCharacteristicRead = "com.swatchdevice.pro.sdk.ble.characteristic_read"
  private val actionCharacteristicNotification = "com.swatchdevice.pro.sdk.ble.characteristic_notification_qc"
  private val actionCharacteristicWrite = "com.swatchdevice.pro.characteristic_write_qc"
  private val actionCharacteristicChanged = "com.swatchdevice.pro.characteristic_changed_qc"
  private val actionBleNoCallback = "com.swatchdevice.pro.sdk.ble.BLE_NO_CALLBACK"
  private val actionBleStatus = "com.swatchdevice.pro.sdk.ble.BLE_STATUS"

  private val sdkLifecycleReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      when (intent.action) {
        actionGattConnected -> {
          val address = intent.getStringExtra("ADDRESS") ?: DeviceManager.getInstance().deviceAddress
          sdkLog("[SDK] Connected broadcast address=$address")
        }
        actionGattDisconnected, actionBleNoCallback -> {
          resetLifecycleFlags()
          val address = intent.getStringExtra("ADDRESS") ?: DeviceManager.getInstance().deviceAddress
          sdkLog("[SDK] Disconnected broadcast action=${intent.action} address=$address", if (intent.action == actionBleNoCallback) "error" else "info")
          sendEvent("onDisconnected", bundleOf("deviceId" to address, "action" to intent.action))
        }
        actionServiceDiscovered -> {
          serviceDiscovered.set(true)
          characteristicsDiscovered.set(true)
          sdkLog("[SDK] Services Discovered")
          sdkLog("[SDK] Characteristics Discovered")
        }
        actionCharacteristicNotification -> {
          if (largeDataEnableRequested.get()) {
            largeDataNotificationsEnabled.set(true)
            sdkLog("[SDK] Large Data Notifications Enabled")
          } else {
            notificationsEnabled.set(true)
            sdkLog("[SDK] Notifications Enabled")
          }
        }
        actionCharacteristicRead -> {
          val uuid = intent.getStringExtra("CHARACTER_UUID") ?: ""
          val status = intent.getIntExtra("STATUS", -1)
          val data = intent.getByteArrayExtra("VALUE") ?: byteArrayOf()
          sdkLog("[SDK] READ uuid=$uuid status=$status value=${hex(data)}")
        }
        actionCharacteristicWrite -> {
          val uuid = intent.getStringExtra("CHARACTER_UUID") ?: ""
          val status = intent.getIntExtra("STATUS", -1)
          val data = intent.getByteArrayExtra("DATA") ?: byteArrayOf()
          sdkLog("[SDK] WRITE uuid=$uuid status=$status value=${hex(data)}")
        }
        actionCharacteristicChanged -> {
          val uuid = intent.getStringExtra("CHARACTER_UUID") ?: ""
          val data = intent.getByteArrayExtra("VALUE") ?: byteArrayOf()
          logRawNotification(uuid, data, "broadcast")
        }
        actionBleStatus -> {
          sdkLog("[SDK] BLE status=${intent.getIntExtra("EXTRA_STATUS", -1)} newState=${intent.getIntExtra("EXTRA_BLE_NEW_STATE", -1)}")
        }
      }
    }
  }

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
      "onBleNotification",
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
      initializeSdkCore(app)
      registerGlassesNotifyListener()
      initialized.set(true)
      sdkLog("initialize(): SDK core, lifecycle receiver, raw callback, and notify listener registered")
      true
    }

    AsyncFunction("connect") { deviceId: String ->
      ensureInitialized()
      sdkLog("connect(): deviceId=$deviceId")
      sendEvent("onConnecting", bundleOf("id" to deviceId))
      resetLifecycleFlags()
      DeviceManager.getInstance().deviceAddress = deviceId
      BleOperateManager.getInstance().connectDirectly(deviceId)
      waitForReadyConnection()
    }

    AsyncFunction("disconnect") {
      sdkLog("disconnect()")
      BleOperateManager.getInstance().disconnect()
      resetLifecycleFlags()
      waitingForPhotoTransfer.set(false)
      sendEvent("onDeviceDisconnected", bundleOf("deviceId" to DeviceManager.getInstance().deviceAddress))
      sendEvent("onDisconnected", bundleOf("deviceId" to DeviceManager.getInstance().deviceAddress))
      true
    }

    AsyncFunction("isConnected") {
      val connected = BleOperateManager.getInstance().isConnected
      val ready = BleOperateManager.getInstance().isReady
      sdkLog("isConnected(): connected=$connected ready=$ready")
      connected
    }

    AsyncFunction("isReady") {
      val ready = BleOperateManager.getInstance().isReady
      sdkLog("isReady(): ready=$ready")
      ready
    }

    AsyncFunction("takePhoto") {
      ensureInitialized()
      val connected = BleOperateManager.getInstance().isConnected
      val ready = BleOperateManager.getInstance().isReady
      sdkLog("takePhoto(): connected=$connected ready=$ready")
      sendCaptureStatus("preflight", "connected=$connected ready=$ready")

      if (!ensureDeviceReadyForCommand("takePhoto")) {
        bundleOf(
          "success" to false,
          "beforeCount" to -1,
          "afterCount" to -1,
          "message" to "Device not ready"
        )
      } else {
        val beforeCounts = requestMediaCountsBlocking("photo-before")
        val beforeCount = beforeCounts?.imageCount ?: -1
        sdkLog("[SDK] Photo before media count: $beforeCount")
        sendCaptureStatus("verify-before", "photos=$beforeCount")

        waitingForPhotoTransfer.set(true)
        photoDelivered.set(false)
        sendEvent("onPhotoStarted", bundleOf("timestamp" to System.currentTimeMillis()))
        sendCaptureStatus("command", "Sending glassesControl [0x02, 0x01, 0x01]")
        LargeDataHandler.getInstance().glassesControl(byteArrayOf(0x02, 0x01, 0x01)) { cmdType, response ->
          handleCaptureResponse(cmdType, response)
        }

        Thread.sleep(3500)
        val afterCounts = requestMediaCountsBlocking("photo-after")
        val afterCount = afterCounts?.imageCount ?: -1
        val success = beforeCount >= 0 && afterCount > beforeCount
        val message = if (success) "Photo captured successfully" else "Photo capture could not be confirmed by media count"
        val result = bundleOf(
          "success" to success,
          "beforeCount" to beforeCount,
          "afterCount" to afterCount,
          "message" to message
        )

        sdkLog("[SDK] Photo media-count verification: $result")
        sendCaptureStatus(if (success) "captured" else "capture-unconfirmed", "before=$beforeCount after=$afterCount")

        if (success) {
          sendEvent("onPhotoCompleted", result)
          requestPictureThumbnailsWithRetry()
        } else {
          waitingForPhotoTransfer.set(false)
          sendEvent("onPhotoFailed", result)
        }

        result
      }
    }

    AsyncFunction("getBattery") {
      ensureInitialized()
      if (!ensureDeviceReadyForCommand("getBattery")) {
        return@AsyncFunction bundleOf("level" to -1, "isCharging" to false, "error" to "Device not ready")
      }

      sdkLog("[SDK] Battery Request")
      val response = requestBatteryBlocking()
      if (response == null) {
        sendError("[SDK] Battery request timed out")
        bundleOf("level" to -1, "isCharging" to false, "error" to "Battery timeout")
      } else {
        bundleOf("level" to response.battery, "isCharging" to response.isCharging)
      }
    }

    AsyncFunction("getMediaCounts") {
      ensureInitialized()
      if (!ensureDeviceReadyForCommand("getMediaCounts")) {
        return@AsyncFunction bundleOf("photos" to -1, "videos" to -1, "audios" to -1, "error" to "Device not ready")
      }

      sdkLog("getMediaCounts(): sending glassesControl [0x02, 0x04]")
      val response = requestMediaCountsBlocking("manual")
      if (response == null) {
        sendError("[SDK] Media count request timed out")
        bundleOf("photos" to -1, "videos" to -1, "audios" to -1, "error" to "Media count timeout")
      } else {
        mediaCountBundle(response)
      }
    }

    AsyncFunction("syncTime") {
      ensureInitialized()
      if (!ensureDeviceReadyForCommand("syncTime")) {
        return@AsyncFunction false
      }

      performTimeSyncBlocking()
    }

    AsyncFunction("getVersionInfo") {
      ensureInitialized()
      if (!ensureDeviceReadyForCommand("getVersionInfo")) {
        return@AsyncFunction bundleOf("hardware" to "", "firmware" to "", "wifiHardware" to "", "wifiFirmware" to "", "error" to "Device not ready")
      }

      sdkLog("[SDK] Version Request")
      val response = requestVersionBlocking()
      if (response == null) {
        sendError("[SDK] Version request timed out")
        bundleOf("hardware" to "", "firmware" to "", "wifiHardware" to "", "wifiFirmware" to "", "error" to "Version timeout")
      } else {
        deviceInfoBundle(response)
      }
    }

    AsyncFunction("enableNotifications") {
      ensureInitialized()
      sdkLog("[SDK] Notifications Enabling")
      val beforeReady = BleOperateManager.getInstance().isReady
      if (!beforeReady && BleOperateManager.getInstance().isConnected) {
        sdkLog("[SDK] enableNotifications(): waiting for SDK ready gate")
      }
      largeDataEnableRequested.set(true)
      LargeDataHandler.getInstance().initEnable()
      registerGlassesNotifyListener()
      sdkLog("enableNotifications(): initEnable and out-device listener registered")
      bundleOf(
        "initialized" to initialized.get(),
        "connected" to BleOperateManager.getInstance().isConnected,
        "ready" to BleOperateManager.getInstance().isReady,
        "notificationsEnabled" to notificationsEnabled.get(),
        "largeDataNotificationsEnabled" to largeDataNotificationsEnabled.get(),
        "timeSynced" to timeSynced.get(),
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
        "serviceDiscovered" to serviceDiscovered.get(),
        "characteristicsDiscovered" to characteristicsDiscovered.get(),
        "notificationsEnabled" to notificationsEnabled.get(),
        "largeDataNotificationsEnabled" to largeDataNotificationsEnabled.get(),
        "timeSynced" to timeSynced.get(),
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
      initializeSdkCore(application())
      registerGlassesNotifyListener()
      initialized.set(true)
    }
  }

  private fun initializeSdkCore(app: Application) {
    val manager = BleOperateManager.getInstance(app)
    if (sdkCoreInitialized.compareAndSet(false, true)) {
      manager.init()
      sdkLog("initializeSdkCore(): BleOperateManager.init() registered SDK internal receivers")
    }
    registerSdkLifecycleReceiver(app)
    manager.setCallback(object : OnGattEventCallback {
      override fun onReceivedData(uuid: String, data: ByteArray) {
        logRawNotification(uuid, data, "callback")
      }
    })
  }

  private fun registerSdkLifecycleReceiver(app: Application) {
    if (!sdkReceiversRegistered.compareAndSet(false, true)) {
      return
    }

    val filter = IntentFilter().apply {
      addAction(actionGattConnected)
      addAction(actionGattDisconnected)
      addAction(actionServiceDiscovered)
      addAction(actionCharacteristicRead)
      addAction(actionCharacteristicNotification)
      addAction(actionCharacteristicWrite)
      addAction(actionCharacteristicChanged)
      addAction(actionBleNoCallback)
      addAction(actionBleStatus)
    }
    LocalBroadcastManager.getInstance(app).registerReceiver(sdkLifecycleReceiver, filter)
    sdkLog("registerSdkLifecycleReceiver(): SDK BLE broadcasts registered")
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

  private fun waitForReadyConnection(): Boolean {
    var connectedEventSent = false
    var notificationInitRequested = false
    var readyForcedAfterNotify = false

    repeat(120) { attempt ->
      val connected = BleOperateManager.getInstance().isConnected
      val ready = BleOperateManager.getInstance().isReady
      sdkLog("connect poll ${attempt + 1}: connected=$connected ready=$ready notifications=${notificationsEnabled.get()} largeData=${largeDataNotificationsEnabled.get()} timeSynced=${timeSynced.get()}")

      if (connected && !connectedEventSent) {
        val payload = bundleOf("id" to DeviceManager.getInstance().deviceAddress, "name" to DeviceManager.getInstance().deviceName)
        sdkLog("[SDK] Connected ${DeviceManager.getInstance().deviceAddress}")
        sendEvent("onDeviceConnected", payload)
        sendEvent("onConnected", payload)
        connectedEventSent = true
      }

      if (connected && notificationsEnabled.get() && !readyForcedAfterNotify && !ready) {
        sdkLog("[SDK] Notification confirmation received; setting SDK ready=true")
        BleOperateManager.getInstance().setReady(true)
        readyForcedAfterNotify = true
      }

      if (connected && BleOperateManager.getInstance().isReady && !notificationInitRequested) {
        sdkLog("[SDK] Ready State TRUE")
        sendEvent("onBluetoothStateChanged", bundleOf("state" to "ready"))
        sdkLog("[SDK] Notifications Enabling")
        largeDataEnableRequested.set(true)
        LargeDataHandler.getInstance().initEnable()
        registerGlassesNotifyListener()
        notificationInitRequested = true
      }

      if (connected && BleOperateManager.getInstance().isReady && notificationInitRequested && largeDataNotificationsEnabled.get()) {
        if (!timeSynced.get()) {
          performTimeSyncBlocking()
        }
        return true
      }
      Thread.sleep(250)
    }

    val connected = BleOperateManager.getInstance().isConnected
    val ready = BleOperateManager.getInstance().isReady
    sdkLog("connect finished: connected=$connected ready=$ready notifications=${notificationsEnabled.get()} largeData=${largeDataNotificationsEnabled.get()}")
    if (!connected || !ready) {
      sendEvent("onSdkError", bundleOf("message" to "SDK connect/ready timeout", "deviceId" to DeviceManager.getInstance().deviceAddress, "connected" to connected, "ready" to ready, "notificationsEnabled" to notificationsEnabled.get()))
    }
    return connected && ready
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
    sdkLog("glasses notify: cmdType=$cmdType bytes=${data.size} data=${hex(data)}")

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

  private fun logRawNotification(uuid: String, data: ByteArray, source: String) {
    val payload = bundleOf(
      "uuid" to uuid,
      "hex" to hex(data),
      "source" to source,
      "timestamp" to System.currentTimeMillis()
    )
    sdkLog("[SDK] Notification Received ($source) uuid=$uuid RX: ${hex(data)}")
    sendEvent("onBleNotification", payload)
  }

  private fun resetLifecycleFlags() {
    serviceDiscovered.set(false)
    characteristicsDiscovered.set(false)
    notificationsEnabled.set(false)
    largeDataEnableRequested.set(false)
    largeDataNotificationsEnabled.set(false)
    timeSynced.set(false)
  }

  private fun ensureDeviceReadyForCommand(commandName: String): Boolean {
    val connected = BleOperateManager.getInstance().isConnected
    val ready = BleOperateManager.getInstance().isReady
    if (!connected || !ready) {
      val message = "Device not ready for $commandName: connected=$connected ready=$ready"
      sendError(message)
      return false
    }
    return true
  }

  private fun performTimeSyncBlocking(): Boolean {
    sdkLog("[SDK] Time Sync Started")
    val latch = CountDownLatch(1)
    var success = false
    LargeDataHandler.getInstance().syncTime(object : ILargeDataResponse<SyncTimeResponse> {
      override fun parseData(cmdType: Int, response: SyncTimeResponse) {
        success = true
        timeSynced.set(true)
        sdkLog("[SDK] Time Sync Success cmdType=$cmdType response=$response")
        latch.countDown()
      }
    })

    if (!latch.await(6, TimeUnit.SECONDS)) {
      sdkLog("[SDK] Time Sync Failed: timeout", "error")
      sendEvent("onSdkError", bundleOf("message" to "Time sync timeout"))
      return false
    }

    return success
  }

  private fun requestBatteryBlocking(): BatteryResponse? {
    val latch = CountDownLatch(1)
    var batteryResponse: BatteryResponse? = null
    LargeDataHandler.getInstance().addBatteryCallBack("react-native") { _, response ->
      if (response != null) {
        batteryResponse = response
        val payload = bundleOf(
          "level" to response.battery,
          "isCharging" to response.isCharging
        )
        sdkLog("[SDK] Battery Response $payload")
        sendEvent("onBatteryUpdate", payload)
        latch.countDown()
      }
    }
    LargeDataHandler.getInstance().syncBattery()
    latch.await(8, TimeUnit.SECONDS)
    return batteryResponse
  }

  private fun requestVersionBlocking(): DeviceInfoResponse? {
    val latch = CountDownLatch(1)
    var versionResponse: DeviceInfoResponse? = null
    LargeDataHandler.getInstance().syncDeviceInfo(object : ILargeDataResponse<DeviceInfoResponse> {
      override fun parseData(cmdType: Int, response: DeviceInfoResponse) {
        versionResponse = response
        sdkLog("[SDK] Version Response cmdType=$cmdType response=$response")
        sendEvent("onBluetoothStateChanged", bundleOf("state" to "version_received"))
        latch.countDown()
      }
    })
    latch.await(8, TimeUnit.SECONDS)
    return versionResponse
  }

  private fun requestMediaCountsBlocking(reason: String): GlassModelControlResponse? {
    val latch = CountDownLatch(1)
    var mediaResponse: GlassModelControlResponse? = null
    sdkLog("[SDK] Media Count Request reason=$reason")
    LargeDataHandler.getInstance().glassesControl(byteArrayOf(0x02, 0x04)) { _, response ->
      if (response.dataType == 4) {
        mediaResponse = response
        val payload = mediaCountBundle(response)
        sdkLog("[SDK] Media Count Response reason=$reason $payload")
        sendEvent("onMediaCountsUpdate", payload)
        sendEvent("onMediaUpdate", payload)
        latch.countDown()
      } else {
        sdkLog("[SDK] Media Count ignored response reason=$reason dataType=${response.dataType} errorCode=${response.errorCode}")
      }
    }
    latch.await(8, TimeUnit.SECONDS)
    return mediaResponse
  }

  private fun deviceInfoBundle(response: DeviceInfoResponse) = bundleOf(
    "hardware" to response.hardwareVersion,
    "firmware" to response.firmwareVersion,
    "wifiHardware" to response.wifiHardwareVersion,
    "wifiFirmware" to response.wifiFirmwareVersion
  )

  private fun mediaCountBundle(response: GlassModelControlResponse) = bundleOf(
    "photos" to response.imageCount,
    "videos" to response.videoCount,
    "audios" to response.recordCount
  )

  private fun hex(data: ByteArray): String = data.joinToString(" ") { "%02X".format(it) }

  private fun deliverPhoto(photoId: String, photoBytes: ByteArray) {
    if (!photoDelivered.compareAndSet(false, true)) {
      sendCaptureStatus("photo", "Ignoring duplicate photo callback for $photoId")
      return
    }

    waitingForPhotoTransfer.set(false)
    val safeId = photoId.replace(Regex("[^A-Za-z0-9._-]"), "_")
    val fileName = if (safeId.endsWith(".jpg", true) || safeId.endsWith(".jpeg", true)) safeId else "$safeId.jpg"
    val photoFile = File(application().cacheDir, fileName)
    photoFile.writeBytes(photoBytes)
    val uri = "file://${photoFile.absolutePath}"

    sendEvent("onPhotoReceived", bundleOf(
      "photoId" to photoId,
      "photoUri" to uri,
      "photoBase64" to Base64.encodeToString(photoBytes, Base64.NO_WRAP)
    ))
    sendCaptureStatus("photo", "Saved photo to $uri")
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
