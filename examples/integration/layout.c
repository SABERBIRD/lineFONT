#include "linefont.h"
#include <json-c/json.h>
#include <stdio.h>
#include <string.h>

/* Return an owned JSON response on success. Release the ABI buffer on both paths. */
static struct json_object *call(const char *request) {
    LintBuffer buffer = lint_call((const uint8_t *)request, strlen(request));
    struct json_tokener *parser = json_tokener_new();
    struct json_object *reply = parser
        ? json_tokener_parse_ex(parser, (const char *)buffer.pointer, (int)buffer.length)
        : NULL;
    if (parser) json_tokener_free(parser);
    lint_free(buffer.pointer, buffer.length);
    struct json_object *ok;
    if (!reply || !json_object_object_get_ex(reply, "ok", &ok)) {
        fprintf(stderr, "%s\n", reply ? json_object_to_json_string(reply) : "Invalid response");
        json_object_put(reply);
        return NULL;
    }
    return reply;
}

int main(int argc, char **argv) {
    if (argc != 2) {
        fprintf(stderr, "Usage: layout font.lint\n");
        return 1;
    }
    struct json_object *font = json_object_from_file(argv[1]);
    if (!font) {
        fprintf(stderr, "Cannot read font JSON\n");
        return 1;
    }
    struct json_object *fonts = json_object_new_array();
    json_object_array_add(fonts, font);
    struct json_object *request = json_object_new_object();
    json_object_object_add(request, "op", json_object_new_string("fonts"));
    json_object_object_add(request, "fonts", fonts);
    struct json_object *catalog = call(json_object_to_json_string(request));
    json_object_put(request);
    if (!catalog) return 1;
    json_object_put(catalog);

    struct json_object *layout = call(
        "{\"op\":\"layout\",\"text\":\"Ґ\",\"height\":4,\"lineHeight\":7.2,\"top\":1.2}");
    if (!layout) return 1;
    puts(json_object_to_json_string(layout));
    json_object_put(layout);
    return 0;
}
