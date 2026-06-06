#include <cstring>
#include <unity.h>
#include "wire_protocol.h"

namespace {

constexpr size_t kMaxFrameBytes = 9 + token_buddy::kMaxFragmentBytes;

void test_single_frame_reassembly_succeeds() {
  token_buddy::FrameAssembler assembler;
  uint8_t frame[kMaxFrameBytes] = {};
  const char* payload = "{\"today\":12}";
  const size_t len = token_buddy::buildTestFrame(frame, sizeof(frame), 7, 0, 1, payload, std::strlen(payload));

  TEST_ASSERT_NOT_EQUAL(0, len);
  TEST_ASSERT_TRUE(assembler.accept(frame, len));
  TEST_ASSERT_TRUE(assembler.complete());
  TEST_ASSERT_EQUAL_STRING(payload, assembler.payload());
}

void test_multi_frame_out_of_order_reassembly_succeeds_in_chunk_order() {
  token_buddy::FrameAssembler assembler;
  uint8_t first[kMaxFrameBytes] = {};
  uint8_t second[kMaxFrameBytes] = {};
  uint8_t third[kMaxFrameBytes] = {};

  const size_t firstLen = token_buddy::buildTestFrame(first, sizeof(first), 12, 0, 3, "Hello ", 6);
  const size_t secondLen = token_buddy::buildTestFrame(second, sizeof(second), 12, 1, 3, "Token ", 6);
  const size_t thirdLen = token_buddy::buildTestFrame(third, sizeof(third), 12, 2, 3, "Buddy", 5);

  TEST_ASSERT_TRUE(assembler.accept(third, thirdLen));
  TEST_ASSERT_FALSE(assembler.complete());
  TEST_ASSERT_TRUE(assembler.accept(first, firstLen));
  TEST_ASSERT_FALSE(assembler.complete());
  TEST_ASSERT_TRUE(assembler.accept(second, secondLen));
  TEST_ASSERT_TRUE(assembler.complete());
  TEST_ASSERT_EQUAL_STRING("Hello Token Buddy", assembler.payload());
}

void test_wrong_magic_rejected() {
  token_buddy::FrameAssembler assembler;
  uint8_t frame[kMaxFrameBytes] = {};
  const size_t len = token_buddy::buildTestFrame(frame, sizeof(frame), 1, 0, 1, "x", 1);
  frame[0] = 'X';

  TEST_ASSERT_FALSE(assembler.accept(frame, len));
  TEST_ASSERT_FALSE(assembler.complete());
}

void test_wrong_kind_rejected() {
  token_buddy::FrameAssembler assembler;
  uint8_t frame[kMaxFrameBytes] = {};
  const size_t len = token_buddy::buildTestFrame(frame, sizeof(frame), 1, 0, 1, "x", 1);
  frame[4] = 2;

  TEST_ASSERT_FALSE(assembler.accept(frame, len));
}

void test_invalid_length_rejected() {
  token_buddy::FrameAssembler assembler;
  uint8_t frame[kMaxFrameBytes] = {};
  const size_t len = token_buddy::buildTestFrame(frame, sizeof(frame), 1, 0, 1, "abc", 3);
  frame[8] = 2;

  TEST_ASSERT_FALSE(assembler.accept(frame, len));
}

void test_zero_chunk_count_and_index_past_count_rejected() {
  token_buddy::FrameAssembler assembler;
  uint8_t frame[kMaxFrameBytes] = {};
  size_t len = token_buddy::buildTestFrame(frame, sizeof(frame), 1, 0, 1, "x", 1);
  frame[7] = 0;

  TEST_ASSERT_FALSE(assembler.accept(frame, len));

  len = token_buddy::buildTestFrame(frame, sizeof(frame), 1, 0, 1, "x", 1);
  frame[6] = 1;
  TEST_ASSERT_FALSE(assembler.accept(frame, len));
}

void test_duplicate_chunk_rejected() {
  token_buddy::FrameAssembler assembler;
  uint8_t frame[kMaxFrameBytes] = {};
  const size_t len = token_buddy::buildTestFrame(frame, sizeof(frame), 2, 0, 2, "Hello ", 6);

  TEST_ASSERT_TRUE(assembler.accept(frame, len));
  TEST_ASSERT_FALSE(assembler.accept(frame, len));
}

void test_mismatched_frame_id_and_chunk_count_rejected() {
  token_buddy::FrameAssembler assembler;
  uint8_t first[kMaxFrameBytes] = {};
  uint8_t wrongId[kMaxFrameBytes] = {};
  uint8_t wrongCount[kMaxFrameBytes] = {};

  const size_t firstLen = token_buddy::buildTestFrame(first, sizeof(first), 9, 0, 2, "a", 1);
  const size_t wrongIdLen = token_buddy::buildTestFrame(wrongId, sizeof(wrongId), 10, 1, 2, "b", 1);
  const size_t wrongCountLen = token_buddy::buildTestFrame(wrongCount, sizeof(wrongCount), 9, 1, 3, "b", 1);

  TEST_ASSERT_TRUE(assembler.accept(first, firstLen));
  TEST_ASSERT_FALSE(assembler.accept(wrongId, wrongIdLen));
  TEST_ASSERT_FALSE(assembler.accept(wrongCount, wrongCountLen));
  TEST_ASSERT_FALSE(assembler.complete());
}

void test_missing_chunk_remains_incomplete() {
  token_buddy::FrameAssembler assembler;
  uint8_t first[kMaxFrameBytes] = {};
  uint8_t third[kMaxFrameBytes] = {};

  const size_t firstLen = token_buddy::buildTestFrame(first, sizeof(first), 3, 0, 3, "a", 1);
  const size_t thirdLen = token_buddy::buildTestFrame(third, sizeof(third), 3, 2, 3, "c", 1);

  TEST_ASSERT_TRUE(assembler.accept(first, firstLen));
  TEST_ASSERT_TRUE(assembler.accept(third, thirdLen));
  TEST_ASSERT_FALSE(assembler.complete());
}

void test_oversized_fragment_rejected_by_builder_and_accept() {
  token_buddy::FrameAssembler assembler;
  uint8_t frame[9 + token_buddy::kMaxFragmentBytes + 1] = {};
  char payload[token_buddy::kMaxFragmentBytes + 1] = {};
  std::memset(payload, 'a', sizeof(payload));

  TEST_ASSERT_EQUAL(0, token_buddy::buildTestFrame(frame, sizeof(frame), 4, 0, 1, payload, sizeof(payload)));

  std::memcpy(frame, "TUB1", 4);
  frame[4] = 1;
  frame[5] = 4;
  frame[6] = 0;
  frame[7] = 1;
  frame[8] = static_cast<uint8_t>(sizeof(payload));
  std::memcpy(frame + 9, payload, sizeof(payload));

  TEST_ASSERT_FALSE(assembler.accept(frame, sizeof(frame)));
}

}  // namespace

int main(int argc, char **argv) {
  UNITY_BEGIN();
  RUN_TEST(test_single_frame_reassembly_succeeds);
  RUN_TEST(test_multi_frame_out_of_order_reassembly_succeeds_in_chunk_order);
  RUN_TEST(test_wrong_magic_rejected);
  RUN_TEST(test_wrong_kind_rejected);
  RUN_TEST(test_invalid_length_rejected);
  RUN_TEST(test_zero_chunk_count_and_index_past_count_rejected);
  RUN_TEST(test_duplicate_chunk_rejected);
  RUN_TEST(test_mismatched_frame_id_and_chunk_count_rejected);
  RUN_TEST(test_missing_chunk_remains_incomplete);
  RUN_TEST(test_oversized_fragment_rejected_by_builder_and_accept);
  return UNITY_END();
}
