// src/utils/whatsapp.js
export const buildEventInterestMessage = ({ eventTitle, authorName, interestedUserName, communityName }) => {
  const community = communityName ? ` in ${communityName}` : '';
  return `Hi ${authorName || 'there'}, this is ${interestedUserName || 'a neighbour'}! I'm interested in your event "${eventTitle}"${community} on Commun. Could you share more details?`;
};

export const buildWhatsAppUrl = (phoneNumber, message) => {
  if (!phoneNumber) return null;
  const cleanPhoneNumber = String(phoneNumber).replace(/\D/g, '');
  if (!cleanPhoneNumber) return null;
  const encodedMessage = encodeURIComponent(message || '');
  return `https://wa.me/${cleanPhoneNumber}?text=${encodedMessage}`;
};