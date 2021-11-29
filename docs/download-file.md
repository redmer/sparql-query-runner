# `download-file`

This step downloads the repository.
The file type is deduced from the file extension and can be made explicit using `format`, specifying the requested mime-type.

The graphs downloaded can be limited using the `"graphs": [ "{{url}}" ]` options.

This step optionally pretty-formats the files with `riot`, if that's available on `$PATH`.
