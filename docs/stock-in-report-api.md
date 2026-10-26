# Stock In report integration

FE route: `/reports/stock-in`, under Report > Stock In. BE contract is from `ReportsController` in `f30c52b`.

`GET /api/reports/stock-in` accepts `startDate`, `endDate`, `partId`, `page`, and `limit`. The report filters **SupplyDate**. A Start Date alone sends the same day as End Date; an End Date alone has no lower bound. Dates are sent as `YYYY-MM-DD`, and the BE includes the whole last day. The part filter works independently or with dates. The BE returns `data` and `pagination`.

Rows contain `id`, `createdAt`, `issueNumber`, `partId`, `partNumber`, `partName`, `supplyQty`, `supplyDate`, `receiptQty`, `receiptDate`, and `balance`. FE displays these fields directly. Part options use the existing parts API.

`GET /api/reports/stock-in/export?format=pdf` sends the same applied filters without pagination, returning all matching rows as `application/pdf`. The FE checks that the file is a nonempty PDF before downloading it. Draft filters do not affect export until Search is pressed. Reset clears all filters and returns to page 1.

The BE currently accepts only PDF export. The FE shows only Export PDF until Excel export is requested and supported.
