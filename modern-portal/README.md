# Modern Cloud & Domain Hosting Portal

Migrated modern stack for the legacy ASP.NET Web Forms application (`httpdocs`).

## Architecture Overview
* **Backend:** Node.js (TypeScript) + Express with modular architecture matching the legacy BLL/DAL layers.
* **Database Access:** Direct SQL Server connection via `mssql` pool, supporting the existing schema and stored procedures.
* **Security & Auth:** JWT-based stateless tokens and bcrypt password hashing.

## Directory Structure
* `src/modules/auth`: User authentication, JWT tokens, and session handling.
* `src/modules/users`: Port of `UsersBLL.cs` and `UsersDAL.cs`.
* `src/modules/domains`: Domain management, WHOIS, DNS, and registrar integrations.
* `src/modules/billing`: Invoices, transactions, and payment callbacks.
* `src/modules/tickets`: Customer support tickets and communications.
* `src/common/database`: Database connection pool and SQL Server helpers.

