import { MessageBus, systemBus } from 'dbus-next'
import { EventEmitter } from 'events'
import { Modem } from './modem'

/**
 * Main interface to interact with Ofono.
 */
export class Ofono extends EventEmitter {
  /**
   * Constructs new Ofono object.
   * @param bus DBus' message bus to be used. Defaults to system bus.
   */
  public constructor(private bus: MessageBus = systemBus()) {
    super()
  }

  /**
   * Retrieves all available modems.
   * @returns List of available modems.
   */
  public async getModems(): Promise<Modem[]> {
    const proxy = await this.bus.getProxyObject('org.ofono', '/')
    const iface = proxy.getInterface('org.ofono.Manager')

    const modems: [string, { [key: string]: { value: unknown } }][] =
      await iface.GetModems()

    return modems.map((m) => Modem.fromDBusObject(m))
  }
}
