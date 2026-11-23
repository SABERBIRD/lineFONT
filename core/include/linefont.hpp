#ifndef LINEFONT_HPP
#define LINEFONT_HPP

#include "linefont.h"
#include <json-c/json.h>
#include <memory>
#include <optional>
#include <stdexcept>
#include <string>
#include <vector>
#include <utility>

namespace linefont {
struct Command { char code; std::vector<double> values; };
struct Glyph {
    size_t start, end;
    std::optional<size_t> font_index;
    double advance;
    std::vector<Command> commands;
};
struct Layout { std::vector<Glyph> glyphs; std::vector<std::string> missing; };

class Error : public std::runtime_error {
public:
    std::string code;
    Error(const char *message, const char *diagnostic_code)
        : std::runtime_error(message), code(diagnostic_code) {}
};

class Engine {
    using Json = std::unique_ptr<json_object, decltype(&json_object_put)>;
    std::vector<std::string> fonts_;

    static json_object *field(json_object *obj, const char *name) {
        return json_object_object_get(obj, name);
    }

    static Json call(json_object *request) {
        const std::string payload = json_object_to_json_string(request);
        const auto response = lint_call(reinterpret_cast<const uint8_t *>(payload.data()), payload.size());
        const auto free_buffer = [length = response.length](uint8_t *pointer) { lint_free(pointer, length); };
        std::unique_ptr<uint8_t, decltype(free_buffer)> buffer(response.pointer, free_buffer);
        const std::string text(reinterpret_cast<const char *>(buffer.get()), response.length);
        Json parsed(json_tokener_parse(text.c_str()), json_object_put);
        if (!parsed) throw Error("Invalid core response", "invalid_response");
        if (auto *err = field(parsed.get(), "error")) {
            auto *code = field(field(parsed.get(), "diagnostic"), "code");
            throw Error(json_object_get_string(err), code ? json_object_get_string(code) : "");
        }
        return Json(json_object_get(field(parsed.get(), "ok")), json_object_put);
    }

public:
    explicit Engine(std::vector<std::string> fonts) : fonts_(std::move(fonts)) {}

    Layout layout(const std::string &text, double height) const {
        Json load(json_object_new_object(), json_object_put);
        json_object_object_add(load.get(), "op", json_object_new_string("fonts"));
        auto *fonts = json_object_new_array();
        json_object_object_add(load.get(), "fonts", fonts);
        for (const auto &source : fonts_) {
            auto *font = json_tokener_parse(source.c_str());
            if (!font) throw Error("Invalid font JSON", "invalid_json");
            json_object_array_add(fonts, font);
        }
        call(load.get());

        Json request(json_object_new_object(), json_object_put);
        json_object_object_add(request.get(), "op", json_object_new_string("layout"));
        json_object_object_add(request.get(), "text", json_object_new_string_len(text.data(), text.size()));
        json_object_object_add(request.get(), "height", json_object_new_double(height));
        json_object_object_add(request.get(), "lineHeight", json_object_new_double(height * 1.8));
        json_object_object_add(request.get(), "top", json_object_new_int(0));
        const auto response = call(request.get());
        Layout result;
        auto *glyphs = field(response.get(), "glyphs");
        for (size_t i = 0; i < json_object_array_length(glyphs); ++i) {
            auto *entry = json_object_array_get_idx(glyphs, i);
            Glyph glyph{
                static_cast<size_t>(json_object_get_int64(field(entry, "start"))),
                static_cast<size_t>(json_object_get_int64(field(entry, "end"))),
                std::nullopt, json_object_get_double(field(entry, "advance")), {}};
            if (auto *index = field(entry, "fontIndex")) glyph.font_index = json_object_get_int64(index);
            auto *commands = field(entry, "commands");
            for (size_t j = 0; j < json_object_array_length(commands); ++j) {
                auto *item = json_object_array_get_idx(commands, j);
                Command command{json_object_get_string(field(item, "code"))[0], {}};
                auto *values = field(item, "values");
                for (size_t k = 0; k < json_object_array_length(values); ++k)
                    command.values.push_back(json_object_get_double(json_object_array_get_idx(values, k)));
                glyph.commands.push_back(std::move(command));
            }
            result.glyphs.push_back(std::move(glyph));
        }
        auto *missing = field(response.get(), "missing");
        for (size_t i = 0; i < json_object_array_length(missing); ++i) {
            auto *entry = json_object_array_get_idx(missing, i);
            result.missing.emplace_back(json_object_get_string(entry), json_object_get_string_len(entry));
        }
        return result;
    }
};
}
#endif
