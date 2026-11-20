# Source-only extension mirror

- [x] Record supplied proxy source, configuration, and unapplied SQL (outside managed migration history).
- [x] Replace only the browser mirror fetch, preserving failure handling and email fetches.
- [x] Run isolated local regression checks: 8 passed; email fetches unchanged. Graph update attempted but CLI unavailable. Automatic build checks still report pre-existing Operations errors, left untouched under source-only scope.
