# Traceability report integration

FE route: `/reports/traceability`, under Report > Traceability. BE contract is from `ReportsController` in `f30c52b`.

`GET /api/reports/traceability` accepts `startDate`, `endDate`, `page`, `limit`, `sortBy=createdAt`, and `sortOrder=asc|desc`. Dates are `YYYY-MM-DD`; the BE filters CreatedAt and includes the whole last day. A Start Date alone sends the same day as End Date. An End Date alone has no lower bound. Sorting and pagination run on the BE.

Each row returns `id`, `createdAt`, `serialNumberClinching`, `serialNumberMfan`, `clinchingIssues`, `mfanIssues`, and `status` (`OK` or `NG`). The table shows the linked serials, issue numbers, status, scan time, and an item PDF action. There are no month, year, Part/Product, or Excel controls.

The item action calls `GET /api/reports/traceability-log/{clinchingSerialNumber}/export?format=pdf` with the selected Clinching serial. It downloads a nonempty `application/pdf` as a sanitized `Traceability_{serial}.pdf` filename. Each row has independent loading and error state. The BE PDF contains that serial's detailed processes and parameters.

The BE also exposes `/api/reports/traceability/export?format=pdf` for the whole report, but the current FE ticket requires PDF per item, so the FE exposes only the item action.
