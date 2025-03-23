import { MessageBus, systemBus } from 'dbus-next'
import { EventEmitter } from 'events'
import { Modem } from './modem'

interface OfonoEvents {
  add: [string, Modem]
  remove: [string]
}

/**
 * Main interface to interact with Ofono.
 */
export class Ofono extends EventEmitter<OfonoEvents> {
  /**
   * Constructs new Ofono object.
   * @param bus DBus' message bus to be used. Defaults to system bus.
   */
  public constructor(private bus: MessageBus = systemBus()) {
    super()

    this.listenForChanges()
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

    return modems.map((m) => Modem.fromDBusObject(m, this.bus))
  }

  private async listenForChanges() {
    const proxy = await this.bus.getProxyObject('org.ofono', '/')
    const iface = proxy.getInterface('org.ofono.Manager')

    iface.on(
      'ModemAdded',
      (
        path: string,
        modem: [string, { [key: string]: { value: unknown } }]
      ) => {
        this.emit('add', path, Modem.fromDBusObject(modem))
      }
    )

    iface.on('ModemRemoved', (path: string) => {
      this.emit('remove', path)
    })
  }
}
