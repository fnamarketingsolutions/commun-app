// screens/secretary/Validatelocalbusinessform.js

const PHONE_RE = /^[+]?[\d\s().-]{7,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/i;

export const validateLocalBusinessForm = (value) => {
  const errors = {};

  if (!value.businessName?.trim()) {
    errors.businessName = 'Business name is required.';
  } else if (value.businessName.trim().length > 120) {
    errors.businessName = 'Business name is too long (max 120 chars).';
  }

  if (!value.ownerName?.trim()) {
    errors.ownerName = 'Owner name is required.';
  }

  if (!value.contactNumber?.trim()) {
    errors.contactNumber = 'Contact number is required.';
  } else if (!PHONE_RE.test(value.contactNumber.trim())) {
    errors.contactNumber = 'Invalid phone number (e.g. +1234567890).';
  }

  if (value.email?.trim() && !EMAIL_RE.test(value.email.trim())) {
    errors.email = 'Invalid email address.';
  }

  if (!value.address?.trim()) {
    errors.address = 'Business address is required.';
  } else if (value.address.trim().length > 500) {
    errors.address = 'Address too long (max 500 chars).';
  }

  if (value.website?.trim() && !URL_RE.test(value.website.trim())) {
    errors.website = 'Must be a valid http(s) URL.';
  }

  if (!value.businessCategories?.length) {
    errors.businessCategories = 'Select a business category.';
  }

  if (value.hasDiscount !== true && value.hasDiscount !== false) {
    errors.hasDiscount = 'Please choose whether this business has a discount.';
  }

  if (value.hasDiscount === true) {
    const pct = Number(value.discountPercentage);
    if (value.discountPercentage === '' || value.discountPercentage == null || Number.isNaN(pct)) {
      errors.discountPercentage = 'Discount percentage is required.';
    } else if (pct <= 0 || pct > 100) {
      errors.discountPercentage = 'Must be between 1 and 100.';
    }

    if (!value.discountStartDate) {
      errors.discountStartDate = 'Start date is required.';
    }
    if (!value.discountEndDate) {
      errors.discountEndDate = 'End date is required.';
    }
    if (value.discountStartDate && value.discountEndDate) {
      const start = new Date(value.discountStartDate);
      const end = new Date(value.discountEndDate);
      if (end < start) {
        errors.discountEndDate = 'End date must be on or after the start date.';
      }
    }
  }

  // Status is optional – it defaults to 'active' on the backend
  if (value.status && !['active', 'inactive'].includes(value.status)) {
    errors.status = 'Status must be active or inactive.';
  }

  return errors;
};