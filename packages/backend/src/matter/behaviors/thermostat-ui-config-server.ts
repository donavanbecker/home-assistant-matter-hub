import { ThermostatUserInterfaceConfigurationServer as Base } from "@matter/main/behaviors";
import { ThermostatUserInterfaceConfiguration } from "@matter/main/clusters";
import { HomeAssistantConfig } from "../../services/home-assistant/home-assistant-config.js";

// Expose Home Assistant's temperature unit preference to Matter controllers.
// Google Home / Apple Home may use temperatureDisplayMode to determine
// whether to show °C or °F for thermostat devices.
class ThermostatUiConfigServerBase extends Base {
  override async initialize() {
    await super.initialize();
    const unit = this.env.get(HomeAssistantConfig).unitSystem.temperature;
    const isFahrenheit = unit === "°F" || unit === "F";
    this.state.temperatureDisplayMode = isFahrenheit
      ? ThermostatUserInterfaceConfiguration.TemperatureDisplayMode.Fahrenheit
      : ThermostatUserInterfaceConfiguration.TemperatureDisplayMode.Celsius;
  }
}

export const ThermostatUiConfigServer = ThermostatUiConfigServerBase.set({
  temperatureDisplayMode:
    ThermostatUserInterfaceConfiguration.TemperatureDisplayMode.Celsius,
  keypadLockout: ThermostatUserInterfaceConfiguration.KeypadLockout.NoLockout,
});
