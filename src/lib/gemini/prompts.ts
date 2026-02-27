export const REVIEW_PROMPTS: Record<string, string> = {
  SA_ID: `You are reviewing a South African Identity Document (ID book or smart ID card).

Analyze the uploaded image and determine:
1. Is this a valid South African ID document?
2. Is the document clearly readable and not blurry?
3. Does it appear to be authentic (not obviously altered or fake)?
4. Extract the following fields if visible: full name, ID number, date of birth.

Respond in JSON format:
{
  "valid": true/false,
  "readable": true/false,
  "authentic": true/false,
  "confidence": 0.0-1.0,
  "extractedFields": {
    "fullName": "string or null",
    "idNumber": "string or null",
    "dateOfBirth": "string or null"
  },
  "issues": ["list of any issues found"],
  "recommendation": "APPROVE" or "FLAG"
}`,

  DRIVERS_LICENSE: `You are reviewing a South African Driver's License.

Analyze the uploaded image and determine:
1. Is this a valid South African driver's license?
2. Is the document clearly readable?
3. Does it appear authentic?
4. Has it expired? Extract the expiry date if visible.
5. Extract: full name, license number, expiry date.

Respond in JSON format:
{
  "valid": true/false,
  "readable": true/false,
  "authentic": true/false,
  "expired": true/false,
  "confidence": 0.0-1.0,
  "extractedFields": {
    "fullName": "string or null",
    "licenseNumber": "string or null",
    "expiryDate": "string or null"
  },
  "issues": ["list of any issues found"],
  "recommendation": "APPROVE" or "FLAG"
}`,

  VEHICLE_REGISTRATION: `You are reviewing a South African Vehicle Registration document.

Analyze the uploaded image and determine:
1. Is this a valid vehicle registration document?
2. Is the document clearly readable?
3. Does it appear authentic?
4. Extract: vehicle make, model, year, registration number, owner name, expiry date.

Respond in JSON format:
{
  "valid": true/false,
  "readable": true/false,
  "authentic": true/false,
  "confidence": 0.0-1.0,
  "extractedFields": {
    "vehicleMake": "string or null",
    "vehicleModel": "string or null",
    "vehicleYear": "string or null",
    "registrationNumber": "string or null",
    "ownerName": "string or null",
    "expiryDate": "string or null"
  },
  "issues": ["list of any issues found"],
  "recommendation": "APPROVE" or "FLAG"
}`,

  COMPANY_REGISTRATION: `You are reviewing a South African Company Registration document.

Analyze the uploaded image and determine:
1. Is this a valid company registration document?
2. Is the document clearly readable?
3. Does it appear authentic?
4. Extract: company name, registration number, directors.

Respond in JSON format:
{
  "valid": true/false,
  "readable": true/false,
  "authentic": true/false,
  "confidence": 0.0-1.0,
  "extractedFields": {
    "companyName": "string or null",
    "registrationNumber": "string or null",
    "directors": "string or null"
  },
  "issues": ["list of any issues found"],
  "recommendation": "APPROVE" or "FLAG"
}`,
};
