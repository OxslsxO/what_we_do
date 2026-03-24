export function getStoredUser() {
  return wx.getStorageSync('user') || null;
}

export function getUserId() {
  const user = getStoredUser();
  return user && user._id ? user._id : '';
}

export function getUserInfo() {
  const user = getStoredUser();
  return (user && user.userInfo) || {};
}

export function isLoggedIn() {
  return !!wx.getStorageSync('token');
}
