import { ClientInterface, MessageBus, systemBus } from 'dbus-next'
import { EventEmitter } from 'events'
import { Modem } from './modem'
import { VoiceCall } from './voiceCall'

interface VoiceCallManagerEvents {
  callAdded: [VoiceCall]
  callRemoved: [string]
  barringActive: [string]
  forwarded: [string]
  change: []
}

/**
 * Representation of Ofono's voice call manager.
 *
 * @see https://github.com/DynamicDevices/ofono/blob/master/doc/voicecallmanager-api.txt
 */
export class VoiceCallManager extends EventEmitter<VoiceCallManagerEvents> {
  private _emergencyNumbers: string[]

  private constructor(
    private path: string,
    data: {
      emergencyNumbers: string[]
    },
    private bus: MessageBus = systemBus()
  ) {
    super()

    this._emergencyNumbers = data.emergencyNumbers

    this.listenForChanges()
  }

  /**
   * Constructs a new voice call manager object.
   * @param modem Instance of Modem
   * @returns Voice call manager object
   */
  public static async ofModem(modem: Modem): Promise<VoiceCallManager> {
    if (modem.interfaces.indexOf('org.ofono.VoiceCallManager') === -1)
      throw new Error(
        `node-ofono: VoiceCallManager.ofModem(): Modem ${modem.path} does not support VoiceCallManager interface`
      )

    const proxy = await modem.bus.getProxyObject('org.ofono', modem.path)
    const iface = proxy.getInterface('org.ofono.VoiceCallManager')

    const props = await iface.GetProperties()

    return new VoiceCallManager(
      modem.path,
      { emergencyNumbers: props.EmergencyNumbers.value },
      modem.bus
    )
  }

  private async getInterface(): Promise<ClientInterface> {
    const proxy = await this.bus.getProxyObject('org.ofono', this.path)
    return proxy.getInterface('org.ofono.VoiceCallManager')
  }

  /**
   * List of emergency numbers.
   */
  public get emergencyNumbers(): string[] {
    return this._emergencyNumbers
  }

  /**
   * Retrieves the list of active calls.
   * @returns List of active calls
   */
  public async getCalls(): Promise<VoiceCall[]> {
    const iface = await this.getInterface()

    const calls: [string, { [key: string]: { value: unknown } }][] =
      await iface.GetCalls()

    return calls.map((c) => VoiceCall.fromDBusObject(c, this.bus))
  }

  /**
   * Dials a specified phone number.
   * @param number Phone number to be dialed
   * @param hideCallerID Whether to hide the caller ID
   * @returns DBus object path of the call
   */
  public async dial(
    number: string,
    hideCallerID?: boolean
  ): Promise<VoiceCall> {
    const iface = await this.getInterface()

    const path = await iface.Dial(
      number,
      typeof hideCallerID === 'undefined'
        ? 'default'
        : hideCallerID
          ? 'enabled'
          : 'disabled'
    )

    return await VoiceCall.fromPath(path)
  }

  /**
   * Joins the active call and the held call into one conference call.
   */
  public async transfer() {
    const iface = await this.getInterface()

    await iface.Transfer()
  }

  /**
   * Swaps the active call with the held call.
   */
  public async swapCalls() {
    const iface = await this.getInterface()

    await iface.Transfer()
  }

  /**
   * Releases the active call and answers the waiting one.
   */
  public async releaseAndAnswer() {
    const iface = await this.getInterface()

    await iface.ReleaseAndAnswer()
  }

  /**
   * Releases the active call and activates the held call.
   */
  public async releaseAndSwap() {
    const iface = await this.getInterface()

    await iface.ReleaseAndSwap()
  }

  /**
   * Holds the active call and answers the waiting one.
   */
  public async holdAndAnswer() {
    const iface = await this.getInterface()

    await iface.HoldAndAnswer()
  }

  /**
   * Hangs up all active calls, except the waiting ones.
   */
  public async hangupAll() {
    const iface = await this.getInterface()

    await iface.HangupAll()
  }

  /**
   * Holds the multiparty call and switches to a desired call.
   * @param path The call to make a private chat with
   * @returns New list of calls participating in the multiparty call
   */
  public async privateChat(path: string): Promise<VoiceCall[]> {
    const iface = await this.getInterface()

    const calls: string[] = await iface.PrivateChat(path)

    return await Promise.all(calls.map((c) => VoiceCall.fromPath(c, this.bus)))
  }

  /**
   * Creates a multiparty call.
   * @returns List of calls participating in the multiparty call
   */
  public async createMultiparty(): Promise<VoiceCall[]> {
    const iface = await this.getInterface()

    const calls: string[] = await iface.CreateMultiparty()

    return await Promise.all(calls.map((c) => VoiceCall.fromPath(c, this.bus)))
  }

  /**
   * Hangs up the multiparty call.
   */
  public async hangupMultiparty() {
    const iface = await this.getInterface()

    await iface.HangupMultiparty()
  }

  public async sendTones(tones: string) {
    if (!/^[0-9a-d*#]*$/i.test(tones)) {
      throw new Error(
        'node-ofono: VoiceCallManager: sendTones(): invalid tone(s)'
      )
    }

    const iface = await this.getInterface()

    await iface.SendTones(tones)
  }

  /**
   * Dials the last dialed number.
   */
  // XXX: does this even exist?
  public async dialLast() {
    const iface = await this.getInterface()

    await iface.DialLast()
  }

  private async listenForChanges() {
    const iface = await this.getInterface()

    iface.on('CallAdded', (path, props) =>
      this.emit('callAdded', VoiceCall.fromDBusObject(path, props))
    )
    iface.on('CallRemoved', (path) => this.emit('callRemoved', path))
    iface.on('BarringActive', (type) => this.emit('barringActive', type))
    iface.on('Forwarded', (type) => this.emit('forwarded', type))

    iface.on('PropertyChanged', (prop, { value }) => {
      switch (prop) {
        case 'EmergencyNumbers':
          this._emergencyNumbers = value
          break
        default:
          console.warn(
            `node-ofono: VoiceCallManager: unhandled property change: ${prop}`
          )
          return
      }
    })
  }
}
