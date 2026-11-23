#include <linefont.hpp>
#include <fstream>
#include <iostream>
#include <iterator>

int main(int argc, char **argv) {
    if (argc != 2) return 2;
    std::ifstream file(argv[1]);
    if (!file) return 2;
    try {
        const std::string font((std::istreambuf_iterator<char>(file)), {});
        const auto result = linefont::Engine({font}).layout("Ґ😀", 4);
        std::cout << result.glyphs.size() << " glyphs, " << result.missing.size() << " missing\n";
        return result.glyphs.size() != 2 || result.missing != std::vector<std::string>{"😀"} ||
            result.glyphs.front().commands.empty();
    } catch (const linefont::Error &error) {
        std::cerr << error.code << " " << error.what() << '\n';
        return 1;
    }
}
