# node-ofono

`node-ofono` is a Node.js binding for the oFono D-Bus interface, enabling seamless interaction with mobile telephony functions on Linux systems.

[![Continuous Deployment](https://github.com/dotandl/node-ofono/actions/workflows/CD.yml/badge.svg)](https://github.com/dotandl/node-ofono/actions/workflows/CD.yml)
![NPM Version](https://img.shields.io/npm/v/ofono)

## Features

- Communicate with oFono over D-Bus
- Manage SIM cards, modems, and mobile network settings
- Ideal for integrating telephony features into Node.js applications

## Installation

Install via npm:

```sh
npm install ofono
```

## Usage

To dial a specified number on all modems connected to the computer:

```javascript
import { Ofono, VoiceCallManager } from 'ofono'

const ofono = new Ofono()

const modems = await ofono.getModems()

for (const modem of modems) {
  const vcm = VoiceCallManager.ofModem(modem)
  vcm.call('5551234567')
}
```

**TODO**: docs

## Contributing

Contributions are welcome! Feel free to submit issues, feature requests, or pull requests on GitHub.

## License

This project is licensed under the [MIT License](./LICENSE).
