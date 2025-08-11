import { Provider, RateTable } from "../types";
import { invert } from "../utils";

const API = "https://api.exchangerate.host/latest";

export class ExchangerateHostProvider implements Provider {
  name = "exchangerate.host";

  async fetchRatesSOS(): Promise<RateTable> {
    // Get USD→others and USD→SOS, then invert to 1 SOS → others
    const symbols = ["SOS","EUR","GBP","KES","ETB","AED","SAR","TRY","CNY","USD"].join(",");
    const url = `${API}?base=USD&symbols=${symbols}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Provider error ${res.status}`);
    const data = await res.json();
    // data.rates: 1 USD in { SOS, EUR, ... }
    const usdTo = data.rates as Record<string, number>;
    const sosPerUsd = usdTo["SOS"]; // 1 USD = X SOS
    if (!sosPerUsd) throw new Error("Provider returned no SOS rate");
    // Build 1 USD in X for all, then produce 1 SOS in X
    return invert(usdTo, sosPerUsd);
  }
}
