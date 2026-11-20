# Source-only extension mirror

- [x] Record supplied proxy source, configuration, and unapplied SQL (outside managed migration history).
- [x] Replace only the browser mirror fetch, preserving failure handling and email fetches.
- [x] Run isolated local regression checks: 8 passed; email fetches unchanged. Graph update attempted but CLI unavailable.
- [x] Clear preview errors with the missing testing-library peer dependency and a compatible string replacement: 11 affected tests passed; automatic preview build OK.
