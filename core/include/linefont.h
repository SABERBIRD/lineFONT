#ifndef LINEFONT_H
#define LINEFONT_H
#include <stddef.h>
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif
typedef struct { uint8_t *pointer; size_t length; } LintBuffer;
uint8_t *lint_alloc(size_t length);
void lint_free(uint8_t *pointer, size_t length);
LintBuffer lint_call(const uint8_t *pointer, size_t length);
#ifdef __cplusplus
}
#endif
#endif
