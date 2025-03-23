import { MessageBus } from 'dbus-next'
import { EventEmitter } from 'events'
import { Modem } from './modem'

interface VoiceCallManagerEvents {
  callAdded: [string, object]
  callRemoved: [string]
  propertyChanged: [string, object]
  barringActive: [string]
  forwarded: [string]
}

/**
 * Representation of Ofono's voice call manager.
 *
 * @see https://github.com/DynamicDevices/ofono/blob/master/doc/voicecallmanager-api.txt
 */
export class VoiceCallManager extends EventEmitter<VoiceCallManagerEvents> {
  private bus: MessageBus
  private path: string

  /**
   * Constructs a new voice call manager object.
   * @param modem Instance of Modem
   */
  public constructor(modem: Modem) {
    super()

    if (modem.interfaces.indexOf('org.ofono.VoiceCallManager') === -1)
      throw new Error(
        `node-ofono: VoiceCallManager(): Modem ${modem.path} does not support VoiceCallManager interface`
      )

    this.bus = modem.bus
    this.path = modem.path

    this.listenForChanges()
  }

  /**
   * Retrieves the list of active calls.
   * @returns List of active calls
   */
  // TODO: Call object
  public async getCalls(): Promise<never[]> {
    const proxy = await this.bus.getProxyObject('org.ofono', this.path)
    const iface = proxy.getInterface('org.ofono.VoiceCallManager')

    return await iface.GetCalls()
  }

  /**
   * Dials a specified phone number.
   * @param number Phone number to be dialed
   * @param hideCallerID Whether to hide the caller ID
   * @returns DBus object path of the call
   */
  public async dial(number: string, hideCallerID?: boolean): Promise<string> {
    const proxy = await this.bus.getProxyObject('org.ofono', this.path)
    const iface = proxy.getInterface('org.ofono.VoiceCallManager')

    return await iface.Dial(
      number,
      typeof hideCallerID === 'undefined'
        ? 'default'
        : hideCallerID
          ? 'enabled'
          : 'disabled'
    )
  }

  /**
   * Joins the active call and the held call into one conference call.
   */
  public async transfer() {
    const proxy = await this.bus.getProxyObject('org.ofono', this.path)
    const iface = proxy.getInterface('org.ofono.VoiceCallManager')

    await iface.Transfer()
  }

  /**
   * Swaps the active call with the held call.
   */
  public async swapCalls() {
    const proxy = await this.bus.getProxyObject('org.ofono', this.path)
    const iface = proxy.getInterface('org.ofono.VoiceCallManager')

    await iface.Transfer()
  }

  /**
   * Releases the active call and answers the waiting one.
   */
  public async releaseAndAnswer() {
    const proxy = await this.bus.getProxyObject('org.ofono', this.path)
    const iface = proxy.getInterface('org.ofono.VoiceCallManager')

    await iface.ReleaseAndAnswer()
  }

  /**
   * Releases the active call and activates the held call.
   */
  public async releaseAndSwap() {
    const proxy = await this.bus.getProxyObject('org.ofono', this.path)
    const iface = proxy.getInterface('org.ofono.VoiceCallManager')

    await iface.ReleaseAndSwap()
  }

  /**
   * Holds the active call and answers the waiting one.
   */
  public async holdAndAnswer() {
    const proxy = await this.bus.getProxyObject('org.ofono', this.path)
    const iface = proxy.getInterface('org.ofono.VoiceCallManager')

    await iface.HoldAndAnswer()
  }

  /**
   * Hangs up all active calls, except the waiting ones.
   */
  public async hangupAll() {
    const proxy = await this.bus.getProxyObject('org.ofono', this.path)
    const iface = proxy.getInterface('org.ofono.VoiceCallManager')

    await iface.HangupAll()
  }

  /**
   * Holds the multiparty call and switches to a desired call.
   * @param path The call to make a private chat with
   * @returns New list of calls participating in the multiparty call
   */
  // TODO: MultipartyCall object
  public async privateChat(path: string): Promise<string[]> {
    const proxy = await this.bus.getProxyObject('org.ofono', this.path)
    const iface = proxy.getInterface('org.ofono.VoiceCallManager')

    return await iface.PrivateChat(path)
  }

  /**
   * Creates a multiparty call.
   * @returns List of calls participating in the multiparty call
   */
  // TODO: MultipartyCall object
  public async createMultiparty(): Promise<string[]> {
    const proxy = await this.bus.getProxyObject('org.ofono', this.path)
    const iface = proxy.getInterface('org.ofono.VoiceCallManager')

    return await iface.CreateMultiparty()
  }

  /**
   * Hangs up the multiparty call.
   */
  public async hangupMultiparty() {
    const proxy = await this.bus.getProxyObject('org.ofono', this.path)
    const iface = proxy.getInterface('org.ofono.VoiceCallManager')

    await iface.HangupMultiparty()
  }

  public async sendTones(tones: string) {
    if (!/^[0-9a-d*#]*$/i.test(tones)) {
      throw new Error(
        'node-ofono: VoiceCallManager: sendTones(): invalid tone(s)'
      )
    }

    const proxy = await this.bus.getProxyObject('org.ofono', this.path)
    const iface = proxy.getInterface('org.ofono.VoiceCallManager')

    await iface.SendTones(tones)
  }

  /**
   * Dials the last dialed number.
   */
  // XXX: does this even exist?
  public async dialLast() {
    const proxy = await this.bus.getProxyObject('org.ofono', this.path)
    const iface = proxy.getInterface('org.ofono.VoiceCallManager')

    await iface.DialLast()
  }

  // TODO: implement EmergencyNumbers prop

  private async listenForChanges() {
    const proxy = await this.bus.getProxyObject('org.ofono', this.path)
    const iface = proxy.getInterface('org.ofono.VoiceCallManager')

    // TODO: typing!!!
    iface.on('CallAdded', (path, props) => this.emit('callAdded', path, props))
    iface.on('CallRemoved', (path) => this.emit('callRemoved', path))
    iface.on('PropertyChanged', (prop, val) =>
      this.emit('propertyChanged', prop, val)
    )
    iface.on('BarringActive', (type) => this.emit('barringActive', type))
    iface.on('Forwarded', (type) => this.emit('forwarded', type))
  }
}
