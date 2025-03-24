import { MessageBus, systemBus, Variant } from 'dbus-next'
import { EventEmitter } from 'events'

interface ModemEvents {
  change: []
}

/**
 * Representation of Ofono's modem.
 *
 * @see https://github.com/rilmodem/ofono/blob/master/doc/modem-api.txt
 */
export class Modem extends EventEmitter<ModemEvents> {
  private _online: boolean
  private _powered: boolean
  private _lockdown: boolean
  private _emergency: boolean | null
  private _name: string | null
  private _serial: string | null
  private _manufacturer: string | null
  private _model: string | null
  private _revision: string | null
  private _interfaces: string[]
  private _type: string

  /**
   * DBus object path of the modem.
   */
  public get path(): string {
    return this._path
  }

  /**
   * Whether the modem is online.
   */
  public get online(): boolean {
    return this._online
  }

  public set online(v: boolean) {
    this._online = v
    this.setProperty('Online', 'b', v)
  }

  /**
   * Whether the modem is on.
   */
  public get powered(): boolean {
    return this._powered
  }

  public set powered(v: boolean) {
    this._powered = v
    this.setProperty('Powered', 'b', v)
  }

  /**
   * The lock state of the modem.
   *
   * @see https://github.com/rilmodem/ofono/blob/efc9c0a85d32706bc088e449e847be41dcc73b3d/doc/modem-api.txt#L42
   */
  public get lockdown(): boolean {
    return this._lockdown
  }

  public set lockdown(v: boolean) {
    this._lockdown = v
    this.setProperty('Lockdown', 'b', v)
  }

  /**
   * Whether the modem is emergency mode (e.g. an emergency call is in progress).
   */
  public get emergency(): boolean | null {
    return this._emergency
  }

  /**
   * Name of the modem.
   */
  public get name(): string | null {
    return this._name
  }

  /**
   * Name of the modem's manufacturer.
   */
  public get manufacturer(): string | null {
    return this._manufacturer
  }

  /**
   * Modem's model.
   */
  public get model(): string | null {
    return this._model
  }

  /**
   * Modem's model revision.
   */
  public get revision(): string | null {
    return this._revision
  }

  /**
   * Serial number of the modem.
   */
  public get serial(): string | null {
    return this._serial
  }

  /**
   * DBus interfaces supported by the modem.
   */
  public get interfaces(): string[] {
    return this._interfaces
  }

  /**
   * Type of the modem.
   */
  public get type(): string {
    return this._type
  }

  public get bus(): MessageBus {
    return this._bus
  }

  private constructor(
    private _path: string,
    data: {
      online: boolean
      powered: boolean
      lockdown: boolean
      emergency?: boolean
      name?: string
      manufacturer?: string
      model?: string
      revision?: string
      serial?: string
      interfaces: string[]
      type: string
    },
    private _bus: MessageBus = systemBus()
  ) {
    super()

    this._online = data.online
    this._powered = data.powered
    this._lockdown = data.lockdown
    this._emergency = data.emergency ?? null
    this._name = data.name ?? null
    this._manufacturer = data.manufacturer ?? null
    this._model = data.model ?? null
    this._revision = data.revision ?? null
    this._serial = data.serial ?? null
    this._interfaces = data.interfaces
    this._type = data.type

    this.listenForChanges()
  }

  /**
   * Constructs a new modem object from raw data obtained from DBus.
   * @param data Data obtained from DBus
   * @param bus DBus' message bus to be used, defaults to the system bus
   * @returns New modem object
   */
  public static fromDBusObject = (
    data: [
      string,
      {
        [key: string]: { value: unknown }
      },
    ],
    bus: MessageBus = systemBus()
  ): Modem =>
    new Modem(
      data[0],
      {
        online: data[1].Online.value as boolean,
        powered: data[1].Powered.value as boolean,
        lockdown: data[1].Lockdown.value as boolean,
        emergency: data[1].Emergency?.value as boolean,
        name: data[1].Name?.value as string,
        manufacturer: data[1].Manufacturer?.value as string,
        model: data[1].Model?.value as string,
        revision: data[1].Revision?.value as string,
        serial: data[1].Serial?.value as string,
        interfaces: data[1].Interfaces.value as string[],
        type: data[1].Type.value as string,
      },
      bus
    )

  private async setProperty<T>(prop: string, signature: string, val: T) {
    const proxy = await this.bus.getProxyObject('org.ofono', this.path)
    const iface = proxy.getInterface('org.ofono.Modem')

    await iface.SetProperty(prop, new Variant(signature, val))
  }

  private async listenForChanges() {
    const proxy = await this.bus.getProxyObject('org.ofono', this.path)
    const iface = proxy.getInterface('org.ofono.Modem')

    iface.on('PropertyChanged', (name, { value }) => {
      switch (name) {
        case 'Online':
          this._online = value
          break
        case 'Powered':
          this._powered = value
          break
        case 'Lockdown':
          this._lockdown = value
          break
        case 'Emergency':
          this._emergency = value
          break
        case 'Name':
          this._name = value
          break
        case 'Manufacturer':
          this._manufacturer = value
          break
        case 'Model':
          this._model = value
          break
        case 'Revision':
          this._revision = value
          break
        case 'Serial':
          this._serial = value
          break
        case 'Interfaces':
          this._interfaces = value
          break
        case 'Type':
          this._type = value
          break
        default:
          console.warn(`node-ofono: Modem: Unhandled property change: ${name}`)
          return
      }

      this.emit('change')
    })
  }
}
