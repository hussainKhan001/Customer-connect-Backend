/* Validation for the three inbound webhook payload shapes — field
   names match the external systems' own casing (PascalCase/snake_case
   as they actually send it, e.g. 'Contact No.', 'Buyer_name'), each
   with a lowerCamelCase fallback in case a future integration sends
   cleaner JSON instead of a legacy PHP-form-style body. */

const str = (v) => (v == null ? '' : String(v).trim());
const orNull = (v) => str(v) || null;

export function validateComplaintWebhook(d) {
  const e = {};
  const name = str(d.Name ?? d.name);
  const contactNo = str(d['Contact No.'] ?? d.contact_no ?? d.contactNo);
  const narration = str(d.Narration ?? d.narration);
  if (!name) e.name = 'Name is required.';
  if (!contactNo) e.contactNo = 'Contact number is required.';
  if (!narration) e.narration = 'Narration is required.';
  if (Object.keys(e).length) return { errors: e, data: null };

  const ts = d.Timestamp ?? d.timestamp;
  return {
    errors: {},
    data: {
      name, contactNo, narration,
      projectName: orNull(d['Project Name'] ?? d.projectname ?? d.project_name),
      unit: orNull(d['Apartment No'] ?? d.apartment_no ?? d.apartmentNo),
      requestType: orNull(d['Request Type'] ?? d.Request_Type),
      requestAbout: orNull(d['Request About'] ?? d.Request_About),
      requestCategory: orNull(d['Request Category'] ?? d.Request_Category),
      imageUrl: orNull(d.Image ?? d.image),
      status: str(d.Status ?? d.status) || 'Pending',
      adminComments: orNull(d['Comments From Admin'] ?? d.admin_comments),
      externalTimestamp: ts ? new Date(ts) : null,
    },
  };
}

export function validateReferralWebhook(d) {
  const e = {};
  const ownerContact = str(d.contact_no ?? d.contactNo);
  const buyerName = str(d.Buyer_name ?? d.buyer_name);
  if (!buyerName) e.buyerName = "Buyer's name is required.";
  if (!ownerContact) e.contactNo = "Referring owner's contact number is required.";
  if (Object.keys(e).length) return { errors: e, data: null };

  const ts = d.Timestamp ?? d.timestamp;
  return {
    errors: {},
    data: {
      ownerName: orNull(d.Name ?? d.name),
      ownerContact,
      ownProperty: orNull(d.Own_property ?? d.own_property),
      unit: orNull(d.Unit_no ?? d.unit_no),
      buyerName,
      buyerContact: orNull(d.Buyer_contact_no ?? d.buyer_contact_no),
      email: orNull(d.Email ?? d.email),
      externalTimestamp: ts ? new Date(ts) : null,
    },
  };
}

export function validateLeadWebhook(d) {
  const e = {};
  const name = str(d.First_Name ?? d.first_name ?? d.name);
  const mobile = str(d.Mobile ?? d.mobile);
  if (!name) e.name = 'Name is required.';
  if (!mobile) e.mobile = 'Mobile is required.';
  if (Object.keys(e).length) return { errors: e, data: null };

  const ts = d.Timestamp ?? d.timestamp;
  return {
    errors: {},
    data: {
      name, mobile,
      propertyType: orNull(d.Type_of_Property ?? d.type_of_property),
      sourceDetail: orNull(d.Lead_Source ?? d.lead_source),
      externalTimestamp: ts ? new Date(ts) : null,
    },
  };
}

/* shared by both status-update webhooks (complaints and leads use
   different status vocabularies, so this only validates presence —
   each route decides what values are acceptable for its own model) */
export function validateStatusWebhook(d) {
  const status = str(d.Status ?? d.status);
  if (!status) return { errors: { status: 'Status is required.' }, data: null };
  return {
    errors: {},
    data: {
      status,
      adminComments: d['Comments From Admin'] != null || d.admin_comments != null
        ? orNull(d['Comments From Admin'] ?? d.admin_comments)
        : undefined,
    },
  };
}
