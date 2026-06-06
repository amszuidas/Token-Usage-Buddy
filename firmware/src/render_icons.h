#pragma once

#include <stdint.h>

namespace token_buddy {

struct IconLine {
  int32_t x1 = 0;
  int32_t y1 = 0;
  int32_t x2 = 0;
  int32_t y2 = 0;
};

struct IconSegments {
  IconLine lines[5];
  uint8_t count = 0;
};

inline IconSegments bluetoothIconSegments(int32_t x, int32_t y) {
  IconSegments icon;
  icon.count = 5;
  icon.lines[0] = {x, y - 9, x, y + 9};
  icon.lines[1] = {x, y - 9, x + 8, y - 3};
  icon.lines[2] = {x - 8, y + 6, x + 8, y - 3};
  icon.lines[3] = {x - 8, y - 6, x + 8, y + 3};
  icon.lines[4] = {x + 8, y + 3, x, y + 9};
  return icon;
}

}  // namespace token_buddy
