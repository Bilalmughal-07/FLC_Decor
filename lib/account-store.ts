import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { DomainError, boolean, id, keys, object, optionalString, string } from "@/lib/backend-validation";
import { seal, unseal } from "@/lib/private-fields";
import { isRetryableTransactionConflict } from "@/lib/database-store";
import { getCustomerAuthRuntime } from "@/lib/supabase/config";

type Account = { id: string; email: string };
function enabled() {
  const runtime = getCustomerAuthRuntime();
  if (!process.env.DATABASE_URL || runtime === "disabled" || (process.env.NODE_ENV === "production" && runtime !== "supabase")) throw new DomainError("ACCOUNT_NOT_CONFIGURED", "Account storage is not configured.", 503);
}
function uniqueConflict(error: unknown) { return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002"); }
async function profile(account: Account) {
  enabled();
  const prisma = getPrisma();
  const normalizedEmail = account.email.trim().toLowerCase();
  const existing = await prisma.customerProfile.findUnique({ where: { authUserId: account.id } });
  if (existing) {
    if (existing.normalizedEmail === normalizedEmail) return existing;
    try { return await prisma.customerProfile.update({ where: { id: existing.id }, data: { normalizedEmail } }); }
    catch (error) { if (uniqueConflict(error)) throw new DomainError("ACCOUNT_LINK_CONFLICT", "This email is already linked to a different identity. Contact support to resolve the account safely.", 409); throw error; }
  }
  try { return await prisma.customerProfile.create({ data: { authUserId: account.id, normalizedEmail } }); }
  catch (error) {
    // Never claim a profile by email alone. A conflict requires a separately
    // authenticated support/account-recovery workflow.
    if (uniqueConflict(error)) throw new DomainError("ACCOUNT_LINK_CONFLICT", "This email is already linked to a different identity. Contact support to resolve the account safely.", 409);
    throw error;
  }
}
function revealAddress(row: { id: string; privateDataCiphertext: string | null; countryCode: string; isDefault: boolean }) {
  if (!row.privateDataCiphertext) throw new DomainError("PRIVATE_DATA_UNAVAILABLE", "Private address data could not be read.", 503);
  const data = addressInput(JSON.parse(unseal(row.privateDataCiphertext)) as unknown);
  return { id: row.id, label: data.label, recipientFirst: data.recipientFirst, recipientLast: data.recipientLast, address1: data.address1, address2: data.address2, city: data.city, region: data.region, postalCode: data.postalCode, countryCode: row.countryCode, phone: data.phone, isDefault: row.isDefault };
}

export async function readProfile(account: Account) {
  const row = await profile(account);
  return { id: row.id, email: row.normalizedEmail, displayName: row.displayName == null ? null : unseal(row.displayName), status: row.status };
}
export async function updateProfile(account: Account, input: unknown) {
  const data = object(input); keys(data, ["displayName"]);
  if (data.displayName === undefined) throw new DomainError("VALIDATION_ERROR", "Display name is required.");
  const row = await profile(account);
  const displayName = optionalString(data.displayName, "Display name", 120);
  const updated = await getPrisma().$transaction(async (tx) => {
    const result = await tx.customerProfile.update({ where: { id: row.id }, data: { displayName: displayName == null ? null : seal(displayName) } });
    await tx.auditEvent.create({ data: { actorType: "CUSTOMER", actorId: account.id, action: "PROFILE_UPDATED", targetType: "CUSTOMER_PROFILE", targetId: row.id } });
    return result;
  });
  return { id: updated.id, email: updated.normalizedEmail, displayName, status: updated.status };
}

export async function listAddresses(account: Account) {
  const row = await profile(account);
  const addresses = await getPrisma().customerAddress.findMany({ where: { customerId: row.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }, { id: "desc" }], take: 100 });
  return addresses.map(revealAddress);
}

function addressInput(input: unknown) {
  const data = object(input); keys(data, ["label", "recipientFirst", "recipientLast", "address1", "address2", "city", "region", "postalCode", "countryCode", "phone", "isDefault"]);
  const countryCode = data.countryCode == null ? "PK" : string(data.countryCode, "Country", 2).toUpperCase();
  if (countryCode !== "PK") throw new DomainError("UNSUPPORTED_COUNTRY", "Only Pakistan addresses are supported by this demo.");
  return {
    label: optionalString(data.label, "Label", 80), recipientFirst: string(data.recipientFirst, "First name", 100), recipientLast: string(data.recipientLast, "Last name", 100), address1: string(data.address1, "Address", 240), address2: optionalString(data.address2, "Address line 2", 240), city: string(data.city, "City", 120), region: optionalString(data.region, "Region", 120), postalCode: optionalString(data.postalCode, "Postal code", 30), countryCode, phone: string(data.phone, "Phone", 40), isDefault: data.isDefault === undefined ? false : boolean(data.isDefault, "Default"),
  };
}

export async function createAddress(account: Account, input: unknown) {
  const data = addressInput(input);
  const row = await profile(account);
  const prisma = getPrisma();
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        // Serialize default-address changes for one account, including the no-address case.
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "CustomerProfile" WHERE "id" = ${row.id} FOR UPDATE`);
        if (data.isDefault) await tx.customerAddress.updateMany({ where: { customerId: row.id, isDefault: true }, data: { isDefault: false } });
        const address = await tx.customerAddress.create({ data: { customerId: row.id, countryCode: data.countryCode, isDefault: data.isDefault, privateDataCiphertext: seal(JSON.stringify(data)), label: null, recipientFirst: "ENCRYPTED", recipientLast: "ENCRYPTED", address1: "ENCRYPTED", address2: null, city: "ENCRYPTED", region: null, postalCode: null, phone: "ENCRYPTED" } });
        await tx.auditEvent.create({ data: { actorType: "CUSTOMER", actorId: account.id, action: "ADDRESS_CREATED", targetType: "CUSTOMER_ADDRESS", targetId: address.id } });
        return address;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
      return revealAddress(created);
    } catch (error) {
      if (isRetryableTransactionConflict(error) && attempt < 3) { await new Promise((resolve) => setTimeout(resolve, 10 * 2 ** attempt + Math.floor(Math.random() * 20))); continue; }
      if (isRetryableTransactionConflict(error)) throw new DomainError("ADDRESS_BUSY", "Address storage is busy; retry the request.", 409);
      throw error;
    }
  }
  throw new DomainError("ADDRESS_BUSY", "Address storage is busy; retry the request.", 409);
}

export async function deleteAddress(account: Account, addressId: string) {
  const row = await profile(account);
  await getPrisma().$transaction(async (tx) => {
    const deleted = await tx.customerAddress.deleteMany({ where: { id: id(addressId), customerId: row.id } });
    if (!deleted.count) throw new DomainError("NOT_FOUND", "Address was not found.", 404);
    await tx.auditEvent.create({ data: { actorType: "CUSTOMER", actorId: account.id, action: "ADDRESS_DELETED", targetType: "CUSTOMER_ADDRESS", targetId: addressId } });
  });
}

export async function setDefaultAddress(account: Account, addressId: string) {
  const row = await profile(account);
  const targetId = id(addressId);
  const prisma = getPrisma();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "CustomerProfile" WHERE "id" = ${row.id} FOR UPDATE`);
        const target = await tx.customerAddress.findFirst({ where: { id: targetId, customerId: row.id } });
        if (!target) throw new DomainError("NOT_FOUND", "Address was not found.", 404);
        await tx.customerAddress.updateMany({ where: { customerId: row.id, isDefault: true, id: { not: targetId } }, data: { isDefault: false } });
        const updated = await tx.customerAddress.update({ where: { id: targetId }, data: { isDefault: true } });
        await tx.auditEvent.create({ data: { actorType: "CUSTOMER", actorId: account.id, action: "DEFAULT_ADDRESS_CHANGED", targetType: "CUSTOMER_ADDRESS", targetId } });
        return revealAddress(updated);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
    } catch (error) {
      if (isRetryableTransactionConflict(error) && attempt < 3) { await new Promise((resolve) => setTimeout(resolve, 10 * 2 ** attempt + Math.floor(Math.random() * 20))); continue; }
      if (isRetryableTransactionConflict(error)) throw new DomainError("ADDRESS_BUSY", "Address storage is busy; retry the request.", 409);
      throw error;
    }
  }
  throw new DomainError("ADDRESS_BUSY", "Address storage is busy; retry the request.", 409);
}

export async function getAccountOrder(account: Account, publicOrderNumber: string) {
  enabled();
  if (!/^FL-[A-Z0-9-]{6,60}$/i.test(publicOrderNumber)) throw new DomainError("NOT_FOUND", "Order was not found.", 404);
  const customer = await getPrisma().customerProfile.findUnique({ where: { authUserId: account.id }, select: { id: true } });
  if (!customer) return null;
  return getPrisma().order.findFirst({
    where: { publicOrderNumber, customerProfileId: customer.id },
    select: {
      publicOrderNumber: true, status: true, fulfillmentStatus: true, paymentStatus: true, paymentMethod: true,
      currency: true, subtotalMinor: true, shippingMinor: true, taxMinor: true, discountMinor: true, totalMinor: true, placedAt: true,
      items: { select: { id: true, productNameSnapshot: true, variantSnapshotJson: true, quantity: true, unitPriceMinor: true, lineTotalMinor: true }, orderBy: { id: "asc" } },
      statusEvents: { select: { toStatus: true, reason: true, createdAt: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
    },
  });
}
