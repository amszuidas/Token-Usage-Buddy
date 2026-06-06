#include <unity.h>

#include "render_icons.h"

void test_bluetooth_icon_uses_standard_rune_segments() {
  const token_buddy::IconSegments icon = token_buddy::bluetoothIconSegments(270, 15);

  TEST_ASSERT_EQUAL_UINT8(5, icon.count);
  TEST_ASSERT_EQUAL_INT32(270, icon.lines[0].x1);
  TEST_ASSERT_EQUAL_INT32(6, icon.lines[0].y1);
  TEST_ASSERT_EQUAL_INT32(270, icon.lines[0].x2);
  TEST_ASSERT_EQUAL_INT32(24, icon.lines[0].y2);

  TEST_ASSERT_EQUAL_INT32(270, icon.lines[1].x1);
  TEST_ASSERT_EQUAL_INT32(6, icon.lines[1].y1);
  TEST_ASSERT_EQUAL_INT32(278, icon.lines[1].x2);
  TEST_ASSERT_EQUAL_INT32(12, icon.lines[1].y2);

  TEST_ASSERT_EQUAL_INT32(262, icon.lines[2].x1);
  TEST_ASSERT_EQUAL_INT32(21, icon.lines[2].y1);
  TEST_ASSERT_EQUAL_INT32(278, icon.lines[2].x2);
  TEST_ASSERT_EQUAL_INT32(12, icon.lines[2].y2);
}
