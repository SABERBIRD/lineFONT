if(NOT TARGET linefont::linefont)
  add_library(linefont::linefont SHARED IMPORTED)
  set_target_properties(linefont::linefont PROPERTIES
    IMPORTED_LOCATION "${CMAKE_CURRENT_LIST_DIR}/liblinefont.so"
    INTERFACE_INCLUDE_DIRECTORIES "${CMAKE_CURRENT_LIST_DIR}"
  )
endif()

if("cpp" IN_LIST linefont_FIND_COMPONENTS AND NOT TARGET linefont::cpp)
  find_package(PkgConfig REQUIRED)
  pkg_check_modules(JSON_C REQUIRED IMPORTED_TARGET json-c)
  add_library(linefont::cpp INTERFACE IMPORTED)
  target_compile_features(linefont::cpp INTERFACE cxx_std_17)
  target_link_libraries(linefont::cpp INTERFACE linefont::linefont PkgConfig::JSON_C)
endif()
