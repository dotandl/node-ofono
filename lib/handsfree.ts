import { ClientInterface, MessageBus, systemBus, Variant } from 'dbus-next'
import { EventEmitter } from 'events'
import { Modem } from './modem'

interface HandsfreeEvents {
  change: []
}

export interface HandsfreeFeatures {
  VoiceRecognition: boolean
  AttachVoiceTag: boolean
  EchoCancellingAndNoiseReduction: boolean
  ThreeWayCalling: boolean
  ReleaseAllHeld: boolean
  ReleaseSpecifiedActiveCall: boolean
  PrivateChat: boolean
  CreateMultiparty: boolean
  Transfer: boolean
  HfIndicators: boolean
}

/**
 * Representation of Ofono's handsfree.
 *
 * @see https://github.com/DynamicDevices/ofono/blob/master/doc/handsfree-api.txt
 */
export class Handsfree extends EventEmitter<HandsfreeEvents> {
  private _features: HandsfreeFeatures
  private _inbandRinging: boolean
  private _voiceRecognition: boolean
  private _echoCancellingNoiseReduction: boolean | null
  private _batteryChargeLevel: number
  private _subscriberNumbers: string[]
  private _distractedDrivingReduction: boolean | null

  private constructor(
    private _path: string,
    data: {
      features: string[]
      inbandRinging: boolean
      voiceRecognition: boolean
      echoCancellingNoiseReduction?: boolean
      batteryChargeLevel: number
      subscriberNumbers: string[]
      distractedDrivingReduction?: boolean
    },
    private _bus: MessageBus = systemBus()
  ) {
    super()

    this._features = this.constructFeatures(data.features)
    this._inbandRinging = data.inbandRinging
    this._voiceRecognition = data.voiceRecognition
    this._echoCancellingNoiseReduction =
      data.echoCancellingNoiseReduction ?? null
    this._batteryChargeLevel = data.batteryChargeLevel
    this._subscriberNumbers = data.subscriberNumbers
    this._distractedDrivingReduction = data.distractedDrivingReduction ?? null

    this.listenForChanges()
  }

  private constructFeatures = (f: string[]): HandsfreeFeatures => {
    return {
      VoiceRecognition: f.includes('voice-recognition'),
      AttachVoiceTag: f.includes('attach-voice-tag'),
      EchoCancellingAndNoiseReduction: f.includes(
        'echo-canceling-and-noise-reduction'
      ),
      ThreeWayCalling: f.includes('three-way-calling'),
      ReleaseAllHeld: f.includes('release-all-held'),
      ReleaseSpecifiedActiveCall: f.includes('release-specified-active-call'),
      PrivateChat: f.includes('private-chat'),
      CreateMultiparty: f.includes('create-multiparty'),
      Transfer: f.includes('transfer'),
      HfIndicators: f.includes('hf-indicators'),
    }
  }

  public static async ofModem(modem: Modem): Promise<Handsfree> {
    if (modem.interfaces.indexOf('org.ofono.Handsfree') === -1)
      throw new Error(
        `node-ofono: Handsfree.ofModem(): Modem ${modem.path} does not support Handsfree interface`
      )

    const proxy = await modem.bus.getProxyObject('org.ofono', modem.path)
    const iface = proxy.getInterface('org.ofono.Handsfree')

    const props = await iface.GetProperties()

    return new Handsfree(
      modem.path,
      {
        features: props.Features.value,
        inbandRinging: props.InbandRinging.value,
        voiceRecognition: props.VoiceRecognition.value,
        echoCancellingNoiseReduction: props.EchoCancellingNoiseReduction?.value,
        batteryChargeLevel: props.BatteryChargeLevel.value,
        subscriberNumbers: props.SubscriberNumbers.value,
        distractedDrivingReduction: props.DistractedDrivingReduction?.value,
      },
      modem.bus
    )
  }

  public get features(): HandsfreeFeatures {
    return this._features
  }

  public get inbandRinging(): boolean {
    return this._inbandRinging
  }

  public get voiceRecognition(): boolean {
    return this._voiceRecognition
  }

  public set voiceRecognition(v: boolean) {
    this._voiceRecognition = v
    this.setProperty('VoiceRecognition', 'b', v)
  }

  public get echoCancellingNoiseReduction(): boolean | null {
    return this._echoCancellingNoiseReduction
  }

  public set echoCancellingNoiseReduction(v: boolean | null) {
    this._echoCancellingNoiseReduction = v
    this.setProperty('EchoCancellingNoiseReduction', 'b', v)
  }

  public get batteryChargeLevel(): number {
    return this._batteryChargeLevel
  }

  public get subscriberNumbers(): string[] {
    return this._subscriberNumbers
  }

  public get distractedDrivingReduction(): boolean | null {
    return this._distractedDrivingReduction
  }

  public set distractedDrivingReduction(v: boolean | null) {
    this._distractedDrivingReduction = v
    this.setProperty('DistractedDrivingReduction', 'b', v)
  }

  private async getInterface(): Promise<ClientInterface> {
    const proxy = await this._bus.getProxyObject('org.ofono', this._path)
    return proxy.getInterface('org.ofono.Handsfree')
  }

  private async setProperty<T>(prop: string, signature: string, val: T) {
    const iface = await this.getInterface()
    await iface.SetProperty(prop, new Variant(signature, val))
  }

  private async listenForChanges() {
    const iface = await this.getInterface()

    iface.on('PropertyChanged', (prop, { value }) => {
      switch (prop) {
        case 'Features':
          this._features = value
          break
        case 'InbandRinging':
          this._inbandRinging = value
          break
        case 'VoiceRecognition':
          this._voiceRecognition = value
          break
        case 'EchoCancellingNoiseReduction':
          this._echoCancellingNoiseReduction = value
          break
        case 'BatteryChargeLevel':
          this._batteryChargeLevel = value
          break
        case 'SubscriberNumbers':
          this._subscriberNumbers = value
          break
        case 'DistractedDrivingReduction':
          this._distractedDrivingReduction = value
          break
        default:
          console.warn(
            `node-ofono: Handsfree: Unhandled property change: ${prop}`
          )
          return
      }

      this.emit('change')
    })
  }
}
