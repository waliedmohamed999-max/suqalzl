/**
 * ShippingProvider (D17, SPEC 6.6). The ONLY implementation now is MANUAL: the vendor (SELF_SHIPPING)
 * or the admin (PLATFORM_SHIPPING) types the carrier and the tracking number; it is stored in
 * Shipment with provider = MANUAL. No carrier API, no automatic label, no webhook. A carrier adapter
 * (O4, deferred) will implement the same interface without touching order logic.
 */
export interface ShipmentCreateInput {
  subOrderId: string;
  carrier: string;
  trackingNumber: string;
  declaredValue?: number; // halalas
}

export interface ShipmentRecord {
  provider: "MANUAL";
  carrier: string;
  trackingNumber: string;
  providerShipmentId: string | null;
  labelPath: string | null;
}

export interface ShippingProvider {
  readonly code: "MANUAL";
  /** null = price comes from ShippingZone (SPEC 6.6) */
  quote(): Promise<null>;
  createShipment(input: ShipmentCreateInput): Promise<ShipmentRecord>;
  track(trackingNumber: string): Promise<null>;
  supportsWebhooks: false;
}

export class InvalidShipmentError extends Error {
  readonly code = "INVALID_SHIPMENT";
}

export class ManualShippingProvider implements ShippingProvider {
  readonly code = "MANUAL" as const;
  readonly supportsWebhooks = false as const;

  async quote() {
    return null;
  }

  async createShipment(input: ShipmentCreateInput): Promise<ShipmentRecord> {
    const carrier = input.carrier.trim();
    const trackingNumber = input.trackingNumber.trim().toUpperCase();
    if (carrier.length < 2 || carrier.length > 60) throw new InvalidShipmentError("carrier");
    if (!/^[A-Z0-9-]{4,40}$/.test(trackingNumber)) throw new InvalidShipmentError("trackingNumber");
    return { provider: "MANUAL", carrier, trackingNumber, providerShipmentId: null, labelPath: null };
  }

  async track() {
    return null; // manual: status is entered by vendor/admin (6.3)
  }
}

let instance: ShippingProvider | undefined;
export function shippingProvider(): ShippingProvider {
  return (instance ??= new ManualShippingProvider());
}
