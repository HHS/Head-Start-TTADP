# 5. Package used to integrate with HSES oauth2

Date: 2020-08-25

## Status

Approved

## Context

To integrate with the HSES oauth2 a package providing that functionality can be used to help the development. Two packages were considered for this purpose:

 1. passport - one of the more popular and extensive Javascript packages covering various authorization flows with multiple strategies. Passport provides a lot of functionality of out the box and was initially explored.

 2. client-oauth2 - a smaller package allowing a straight-forward implementation.

## Decision

Even though passport was originally considered, client-oauth2 will be used.

## Consequences

Even though providing a lot of support, passport proved to be cumbersome to implement due to its limitations supporting basic authentication. Since HSES expects basic authentication on requests providing client id and client secret, we needed a package supporting it. Mainly for that reason, client-oauth2 was chosen instead.
