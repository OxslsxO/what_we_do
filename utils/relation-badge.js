export function syncRelationBadge(unreadCount = 0) {
  const count = Number(unreadCount || 0);

  if (!count) {
    wx.removeTabBarBadge({
      index: 2,
      fail: () => {}
    });
    return;
  }

  wx.setTabBarBadge({
    index: 2,
    text: count > 99 ? '99+' : String(count),
    fail: () => {}
  });
}
