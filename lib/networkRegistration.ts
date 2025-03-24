import { ClientInterface, MessageBus, systemBus } from 'dbus-next'
import EventEmitter from 'events'
import { Modem } from './modem'

interface NetworkRegistrationEvents {
  change: []
}

export enum NetworkRegistrationMode {
  Auto = 'auto',
  AutoOnly = 'auto-only',
  Manual = 'manual',
}

export enum NetworkRegistrationStatus {
  Unregistered = 'unregistered',
  Registered = 'registered',
  Searching = 'searching',
  Denied = 'denied',
  Unknown = 'unknown',
  Roaming = 'roaming',
}

export interface NetworkRegistrationTechnology {
  GSM: boolean
  EDGE: boolean
  UMTS: boolean
  HSPA: boolean
  LTE: boolean
}

/**
 * Representation of Ofono's network registration interface.
 *
 * @see https://github.com/DynamicDevices/ofono/blob/master/doc/network-api.txt
 */
export class NetworkRegistration extends EventEmitter<NetworkRegistrationEvents> {
  private _mode: NetworkRegistrationMode
  private _status: NetworkRegistrationStatus
  private _locationAreaCode: number | null
  private _cellID: number | null
  private _mobileCountryCode: string | null
  private _mobileNetworkCode: string | null
  private _technology: NetworkRegistrationTechnology | null
  private _name: string
  private _strength: number | null
  private _baseStation: string | null

  private constructor(
    private _path: string,
    data: {
      mode: string
      status: string
      locationAreaCode?: number
      cellID?: number
      mobileCountryCode?: string
      mobileNetworkCode?: string
      technology?: string[]
      name: string
      strength?: number
      baseStation?: string
    },
    private _bus: MessageBus = systemBus()
  ) {
    super()

    this._mode =
      NetworkRegistrationMode[data.mode as keyof typeof NetworkRegistrationMode]
    this._status =
      NetworkRegistrationStatus[
        data.status as keyof typeof NetworkRegistrationStatus
      ]
    this._locationAreaCode = data.locationAreaCode ?? null
    this._cellID = data.cellID ?? null
    this._mobileCountryCode = data.mobileCountryCode ?? null
    this._mobileNetworkCode = data.mobileNetworkCode ?? null
    this._technology = data.technology
      ? this.constructTechnology(data.technology)
      : null
    this._name = data.name
    this._strength = data.strength ?? null
    this._baseStation = data.baseStation ?? null

    this.listenForChanges()
  }

  private constructTechnology = (
    t: string[]
  ): NetworkRegistrationTechnology => ({
    GSM: t.includes('gsm'),
    EDGE: t.includes('edge'),
    UMTS: t.includes('umts'),
    HSPA: t.includes('hspa'),
    LTE: t.includes('lte'),
  })

  /**
   * Constructs a new network object.
   * @param modem Instance of modem
   * @returns Network object
   */
  public static async ofModem(modem: Modem): Promise<NetworkRegistration> {
    if (modem.interfaces.indexOf('org.ofono.NetworkRegistration') === -1)
      throw new Error(
        `node-ofono: Network.ofModem(): Modem ${modem.path} does not support NetworkRegistration interface`
      )

    const proxy = await modem.bus.getProxyObject('org.ofono', modem.path)
    const iface = proxy.getInterface('org.ofono.NetworkRegistration')

    const props = await iface.GetProperties()

    return new NetworkRegistration(
      modem.path,
      {
        mode: props.Mode.value,
        status: props.Status.value,
        locationAreaCode: props.LocationAreaCode?.value,
        cellID: props.CellId?.value,
        mobileCountryCode: props.MobileCountryCode?.value,
        mobileNetworkCode: props.MobileNetworkCode?.value,
        technology: props.Technology?.value,
        name: props.Name.value,
        strength: props.Strength?.value,
        baseStation: props.BaseStation?.value,
      },
      modem.bus
    )
  }

  private async getInterface(): Promise<ClientInterface> {
    const proxy = await this._bus.getProxyObject('org.ofono', this._path)
    return proxy.getInterface('org.ofono.NetworkRegistration')
  }

  /**
   * Network registration mode.
   */
  public get mode(): NetworkRegistrationMode {
    return this._mode
  }

  /**
   * Registration status of the modem.
   */
  public get status(): NetworkRegistrationStatus {
    return this._status
  }

  /**
   * Current location area code.
   */
  public get locationAreaCode(): number | null {
    return this._locationAreaCode
  }

  /**
   * Current network cell ID.
   */
  public get cellID(): number | null {
    return this._cellID
  }

  /**
   * Mobile Country Code (MCC).
   */
  public get mobileCountryCode(): string | null {
    return this._mobileCountryCode
  }

  /**
   * Mobile Network Code (MNC).
   */
  public get mobileNetworkCode(): string | null {
    return this._mobileNetworkCode
  }

  /**
   * Contains available technologies of the current network.
   */
  public get technology(): NetworkRegistrationTechnology | null {
    return this._technology
  }

  /**
   * Operator name.
   */
  public get name(): string {
    return this._name
  }

  /**
   * Signal strength as a percentage (0-100).
   */
  public get strength(): number | null {
    return this._strength
  }

  /**
   * Name of the base station.
   */
  public get baseStation(): string | null {
    return this._baseStation
  }

  /**
   * Attempts to register to the default network.
   */
  public async register() {
    const iface = await this.getInterface()
    await iface.Register()
  }

  /**
   * Retrieves list of operators.
   * @returns List of operators
   */
  public async getOperators(): Promise<[string, object][]> {
    const iface = await this.getInterface()
    return await iface.GetOperators()
  }

  /**
   * Runs a network operators scan.
   * @returns List of operators
   */
  public async scan(): Promise<[string, object][]> {
    const iface = await this.getInterface()
    return await iface.Scan()
  }

  private async listenForChanges() {
    const iface = await this.getInterface()

    iface.on('PropertyChanged', (prop, { value }) => {
      switch (prop) {
        case 'Mode':
          this._mode = value
          break
        case 'Status':
          this._status = value
          break
        case 'LocationAreaCode':
          this._locationAreaCode = value
          break
        case 'CellId':
          this._cellID = value
          break
        case 'MobileCountryCode':
          this._mobileCountryCode = value
          break
        case 'MobileNetworkCode':
          this._mobileNetworkCode = value
          break
        case 'Technology':
          this._technology = value
          break
        case 'Name':
          this._name = value
          break
        case 'Strength':
          this._strength = value
          break
        case 'BaseStation':
          this._baseStation = value
          break
        default:
          console.warn(
            `node-ofono: NetworkRegistration: Unhandled property change: ${prop}`
          )
          break
      }

      this.emit('change')
    })
  }
}
