export type DiagnosticEventLevel = 'info' | 'warn' | 'error' | 'debug';
export type DiagnosticEventSource = 'APP' | 'SDK' | 'BLE' | 'NATIVE';

export interface DiagnosticEvent {
  id: number;
  timestamp: number;
  source: DiagnosticEventSource;
  level: DiagnosticEventLevel;
  message: string;
  data?: unknown;
}

type Listener = (events: DiagnosticEvent[]) => void;

class SDKLogger {
  private events: DiagnosticEvent[] = [];
  private listeners = new Set<Listener>();
  private nextId = 1;
  private maxEvents = 100;

  log(source: DiagnosticEventSource, message: string, data?: unknown, level: DiagnosticEventLevel = 'info') {
    const event: DiagnosticEvent = {
      id: this.nextId++,
      timestamp: Date.now(),
      source,
      level,
      message,
      data,
    };

    this.events = [event, ...this.events].slice(0, this.maxEvents);
    this.emit();

    const consoleMessage = `[${source}] ${message}`;
    if (level === 'error') {
      console.error(consoleMessage, data ?? '');
    } else if (level === 'warn') {
      console.warn(consoleMessage, data ?? '');
    } else {
      console.log(consoleMessage, data ?? '');
    }
  }

  info(source: DiagnosticEventSource, message: string, data?: unknown) {
    this.log(source, message, data, 'info');
  }

  debug(source: DiagnosticEventSource, message: string, data?: unknown) {
    this.log(source, message, data, 'debug');
  }

  warn(source: DiagnosticEventSource, message: string, data?: unknown) {
    this.log(source, message, data, 'warn');
  }

  error(source: DiagnosticEventSource, message: string, data?: unknown) {
    this.log(source, message, data, 'error');
  }

  getEvents() {
    return this.events;
  }

  clear() {
    this.events = [];
    this.emit();
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.events);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    this.listeners.forEach(listener => listener(this.events));
  }
}

export const sdkLogger = new SDKLogger();
