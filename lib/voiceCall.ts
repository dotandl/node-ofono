import { ClientInterface, MessageBus, systemBus } from 'dbus-next'
import { EventEmitter } from 'events'

interface VoiceCallEvents {
  disconnectReason: [string]
  change: []
}

export enum VoiceCallState {
  /**
   * The call is active.
   */
  Active = 'active',

  /**
   * The call is on hold.
   */
  Held = 'held',

  /**
   * The call is being dialed.
   */
  Dialing = 'dialing',

  /**
   * The remote party is being alerted.
   */
  Alerting = 'alerting',

  /**
   * Incoming call in progress.
   */
  Incoming = 'incoming',

  /**
   * The call is waiting.
   */
  Waiting = 'waiting',

  /**
   * The call is over. No further actions are possible.
   */
  Disconnected = 'disconnected',
}

/**
 * Representation of Ofono's voice call.
 *
 * @see https://github.com/DynamicDevices/ofono/blob/master/doc/voicecall-api.txt
 */
export class VoiceCall extends EventEmitter<VoiceCallEvents> {
  private _lineIdentification: string
  private _incomingLine: string | null
  private _name: string
  private _multiparty: boolean
  private _state: VoiceCallState
  private _startTime: string | null
  private _information: string | null
  private _icon: number | null
  private _emergency: boolean
  private _remoteHeld: boolean
  private _remoteMultiparty: boolean

  /**
   * DBus object path of the voice call.
   */
  public get path(): string {
    return this._path
  }

  /**
   * Line identification information returned by the network.
   */
  public get lineIdentification(): string {
    return this._lineIdentification
  }

  /**
   * Called line identification information returned by the network.
   */
  public get incomingLine(): string | null {
    return this._incomingLine
  }

  /**
   * Name identification information returned by the network.
   */
  public get name(): string {
    return this._name
  }

  /**
   * Whether the call is part of a multiparty call.
   */
  public get multiparty(): boolean {
    return this._multiparty
  }

  /**
   * State of the call.
   */
  public get state(): VoiceCallState {
    return this._state
  }

  /**
   * Start time of the call.
   */
  public get startTime(): string | null {
    return this._startTime
  }

  /**
   * Information related to the call.
   */
  public get information(): string | null {
    return this._information
  }

  /**
   * Icon to be used instead of or with the text information.
   */
  public get icon(): number | null {
    return this._icon
  }

  /**
   * Whether the call is an emergency call.
   */
  public get emergency(): boolean {
    return this._emergency
  }

  /**
   * Whether the remote party is on hold.
   */
  public get remoteHeld(): boolean {
    return this._remoteHeld
  }

  /**
   * Whether the remote party joined this call into a multiparty call.
   */
  public get remoteMultiparty(): boolean {
    return this._remoteMultiparty
  }

  private constructor(
    private _path: string,
    data: {
      lineIdentification: string
      incomingLine: string | null
      name: string
      multiparty: boolean
      state: string
      startTime: string | null
      information: string | null
      icon: number | null
      emergency: boolean
      remoteHeld: boolean
      remoteMultiparty: boolean
    },
    private _bus: MessageBus = systemBus()
  ) {
    super()

    this._lineIdentification = data.lineIdentification
    this._incomingLine = data.incomingLine
    this._name = data.name
    this._multiparty = data.multiparty
    this._state = VoiceCallState[data.state as keyof typeof VoiceCallState]
    this._startTime = data.startTime
    this._information = data.information
    this._icon = data.icon
    this._emergency = data.emergency
    this._remoteHeld = data.remoteHeld
    this._remoteMultiparty = data.remoteMultiparty

    this.listenForChanges()
  }

  /**
   * Constructs a new voice call object from raw data obtained from DBus.
   * @param data Data obtained from DBus
   * @param bus DBus' message bus to be used, defaults to the system bus
   * @returns New voice call object
   */
  public static fromDBusObject = (
    data: [
      string,
      {
        [key: string]: { value: unknown }
      },
    ],
    bus: MessageBus = systemBus()
  ): VoiceCall =>
    new VoiceCall(
      data[0],
      {
        lineIdentification: data[1].LineIdentification.value as string,
        incomingLine: data[1].IncomingLine?.value as string,
        name: data[1].Name.value as string,
        multiparty: data[1].Multiparty.value as boolean,
        state: data[1].State.value as string,
        startTime: data[1].StartTime?.value as string,
        information: data[1].Information?.value as string,
        icon: data[1].Icon?.value as number,
        emergency: data[1].Emergency.value as boolean,
        remoteHeld: data[1].RemoteHeld.value as boolean,
        remoteMultiparty: data[1].RemoteMultiparty.value as boolean,
      },
      bus
    )

  public static async fromPath(
    path: string,
    bus: MessageBus = systemBus()
  ): Promise<VoiceCall> {
    const proxy = await bus.getProxyObject('org.ofono', path)
    const iface = proxy.getInterface('org.ofono.VoiceCall')

    const props = await iface.GetProperties()

    return new VoiceCall(
      path,
      {
        lineIdentification: props.LineIdentification.value as string,
        incomingLine: props.IncomingLine?.value as string,
        name: props.Name.value as string,
        multiparty: props.Multiparty.value as boolean,
        state: props.State.value as string,
        startTime: props.StartTime?.value as string,
        information: props.Information?.value as string,
        icon: props.Icon?.value as number,
        emergency: props.Emergency.value as boolean,
        remoteHeld: props.RemoteHeld.value as boolean,
        remoteMultiparty: props.RemoteMultiparty.value as boolean,
      },
      bus
    )
  }

  private async getInterface(): Promise<ClientInterface> {
    const proxy = await this._bus.getProxyObject('org.ofono', this.path)
    return proxy.getInterface('org.ofono.VoiceCall')
  }

  /**
   * Deflects the incoming or waiting call to a given phone number.
   * @param number Phone number to deflect the call to
   */
  public async deflect(number: string) {
    const iface = await this.getInterface()
    await iface.Deflect(number)
  }

  /**
   * Hangs up the call.
   */
  public async hangup() {
    const iface = await this.getInterface()
    await iface.Hangup()
  }

  /**
   * Answers the incoming call.
   */
  public async answer() {
    const iface = await this.getInterface()
    await iface.Hangup()
  }

  private async listenForChanges() {
    const iface = await this.getInterface()

    iface.on('DisconnectReason', (reason) =>
      this.emit('disconnectReason', reason)
    )

    iface.on('PropertyChanged', (prop, { value }) => {
      switch (prop) {
        case 'LineIdentification':
          this._lineIdentification = value
          break
        case 'IncomingLine':
          this._incomingLine = value
          break
        case 'Name':
          this._name = value
          break
        case 'Multiparty':
          this._multiparty = value
          break
        case 'State':
          this._state = VoiceCallState[value as keyof typeof VoiceCallState]
          break
        case 'StartTime':
          this._startTime = value
          break
        case 'Information':
          this._information = value
          break
        case 'Icon':
          this._icon = value
          break
        case 'Emergency':
          this._emergency = value
          break
        case 'RemoteHeld':
          this._remoteHeld = value
          break
        case 'RemoteMultiparty':
          this._remoteMultiparty = value
          break
        default:
          console.warn(
            `node-ofono: VoiceCall: Unhandled property change: ${prop}`
          )
          return
      }

      this.emit('change')
    })
  }
}
