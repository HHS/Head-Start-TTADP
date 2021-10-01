# 15. External Facing API Design and Implementation

Date: 2021-09-23

## Status

Accepted

## Context

The Office of Head Start is expanding data sharing across internal systems. To support this, TTA Hub would like
to make documented APIs available to external systems in reliable, consistent, and secure ways.

### Options Considered

To achieve this, two paths were considered.

#### Expose existing internal APIs

TTA Hub has a robust set of APIs already implemented to support the React frontend.

Pros:

* already implemented
* well documented

Cons:

* API is highly coupled to TTA Hub UI needs, will become more difficult to change rapidly
* authentication is based on sessions stored in browser cookies
* authorization fully limited to existing TTA Hub roles

#### Create a new API layer for external partners

Creating a new API layer would de-couple the data needs from the TTA Hub UI needs.

Pros:

* existing API can continue to be optimized for UI considerations
* new API can be more rigidly backwards-compatible
* authentication schemes can be easily customized for each use
* authorization can be scope-based and integrated into the full HSES OAuth implementation

Cons:

* two API endpoints will need to be maintained through data model changes

## Decision

A new API layer has been chosen as the better set of trade offs.

To distinguish between the API flavors, the external API will be namespaced under the `/api/v1` route path.

### Authentication

The initial API client also utilizes HSES as a single-sign-on solution, so API authentication will be done
by passing an HSES token via the `Authentication` HTTP header. TTA Hub will then validate that token with HSES
to verify the user.

### JSON Format

To promote consistency, the external facing API will conform to [the JSON:API schema](https://jsonapi.org/)
as much as possible. The first endpoints will include objects in `attributes` that may eventually migrate
to `relationships`. This trade-off has been made due to the exponential growth of required API endpoints when each
object is represented in the `relationships` section.

## Consequences

The result of this decision will be a stable external API with simple authentication logic, while maintaining agility
in the UI-driven internal API. The risk comes from undertaking and maintaining a second representation of the TTA Hub data.
