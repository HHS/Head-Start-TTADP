Workflow Diagrams
=================

Collection of various workflows and processes present in the TTA Smart Hub application.

Account Creation
----------------

<img src="http://www.plantuml.com/plantuml/png/dP91JyCm38Nl_HNcjlq5Tc0W8OtpDkvMwgtMqcJ4piR-FKcAKPd4XLkL-dtlvSLhKKoQHzyzd1CUHuGiz4v9sQ5_Eq0CNPle7lT22Nmy2d202oDijg_RLSS7MBHV0qex0dGkvg1FIz210Ynk9CiEO0AmGAAU4pcb7ZJ2RlUysR_0bNMeIX8ffoSAgo8nTbNvw4xKtqCDEsPH40fzeNza4fsXuvaIQamL33bKa6LSDOHeF9SFyaBpsvY-o4SMuHW4XFJF27YhzTHsiEIuC5qXaOkfbohWz0k4tiVhP5zIVxl38iG9QJaiAD0dYygFjysPkOrn8MUD8xRtypTmYL2fhqxcKNERCH_-K-A05xglfJWOS2fqTg4vtz2Mk0KiaBO17AQjCiQw4FFelm00" alt="rendered account creation diagram">

### UML Source

```
@startuml
!pragma useVerticalIf on
start
:User logs in via HSES;
if (User has HSES account?) then (yes)
  :User is redirected to TTAHUB with access token;
  if (User is locked?) then (yes)
    :User must send request to TTAHUB operators to unlock account;
    stop
  elseif (User has TTAHUB permissions set?) then (yes)
    :User may log in and view records their permissions allow;
    end
  else (no)
    if (User account exists?) then (no)
      :User account is automatically created;
    else (yes)
    endif
    :User must send request to TTAHUB operators to have permissions set;
  endif
  stop
else (no)
  :User must request account creation within HSES;
  stop
@enduml
```

[Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/dP91JyCm38Nl_HNcjlq5Tc0W8OtpDkvMwgtMqcJ4piR-FKcAKPd4XLkL-dtlvSLhKKoQHzyzd1CUHuGiz4v9sQ5_Eq0CNPle7lT22Nmy2d202oDijg_RLSS7MBHV0qex0dGkvg1FIz210Ynk9CiEO0AmGAAU4pcb7ZJ2RlUysR_0bNMeIX8ffoSAgo8nTbNvw4xKtqCDEsPH40fzeNza4fsXuvaIQamL33bKa6LSDOHeF9SFyaBpsvY-o4SMuHW4XFJF27YhzTHsiEIuC5qXaOkfbohWz0k4tiVhP5zIVxl38iG9QJaiAD0dYygFjysPkOrn8MUD8xRtypTmYL2fhqxcKNERCH_-K-A05xglfJWOS2fqTg4vtz2Mk0KiaBO17AQjCiQw4FFelm00)

Account Termination
-------------------

<img src="http://www.plantuml.com/plantuml/png/XOynQeP048NxFSKhjKkQ49BYzm2f0XvWq56NpEx8pgxYxRCA5e64DCFmU7mVhxDCAPSWxdfSufKfu-sJDyyxYd423OEMcD-Tdz3qPo9a6QBpp2DyHD34o0j5FBy-OQJ3GBC-sffnH7EmjQuIWsuC4i7AANWphz4m9GteVsXOZFzNlVnf-j3XwnSacgYjupZwwPwvBrvgVaBlhY4hqhN-SRLTLqy9yWq0" alt="rendered account termination diagram">

### UML Source

```
@startuml
start
repeat :Review user account;
if (User last logged in more than 180 days ago?) then (yes)
:Remove all permissions from User account;
elseif (User last logged in more than 60 days ago?) then (yes)
:Lock User account;
else (no)
endif
repeat while (more accounts to review?)
end
@enduml
```

[Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/XOynQeP048NxFSKhjKkQ49BYzm2f0XvWq56NpEx8pgxYxRCA5e64DCFmU7mVhxDCAPSWxdfSufKfu-sJDyyxYd423OEMcD-Tdz3qPo9a6QBpp2DyHD34o0j5FBy-OQJ3GBC-sffnH7EmjQuIWsuC4i7AANWphz4m9GteVsXOZFzNlVnf-j3XwnSacgYjupZwwPwvBrvgVaBlhY4hqhN-SRLTLqy9yWq0)


Setting Permissions
-------------------

<img src="http://www.plantuml.com/plantuml/png/ZP11JWCn34NtESNVCRt2T44hRa3R0qIfPuZ8s60x86wF9niaLjrOzlzVxqi-cMVrlhKqbZIVIv7EZYrpNacXz5Nfsz0jZW_IhPfLuT0_EvaVKrqmtNQp6ZAkrpDUX5rpST7d0_oD6DCFsI41yuNyFycGerBlbLUu3FV9eD88esQDJ6wuU5wMFVCgvgJ7HCq84yk3t4Bi6XpHFwO4iT3e2XxVwvBc6pSfxmCsj7IA4V_v1G00" alt="setting access permissions diagram">

### UML Source

```
@startuml
start
:Account manager reviews user permission request;
if (User is a TTA Contractor?) then (yes)
  :Set user permissions according to user's role on regional Staffing Roster;
else (no)
  :Set user permissions according to central or regional office role;
endif
:Unlock user;
end
@enduml
```

[Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/ZP11JWCn34NtESNVCRt2T44hRa3R0qIfPuZ8s60x86wF9niaLjrOzlzVxqi-cMVrlhKqbZIVIv7EZYrpNacXz5Nfsz0jZW_IhPfLuT0_EvaVKrqmtNQp6ZAkrpDUX5rpST7d0_oD6DCFsI41yuNyFycGerBlbLUu3FV9eD88esQDJ6wuU5wMFVCgvgJ7HCq84yk3t4Bi6XpHFwO4iT3e2XxVwvBc6pSfxmCsj7IA4V_v1G00)

--------------------------------------------------------------------------------

### Instructions

1. Edit each diagram using the relevant link
1. Copy and paste the final UML into the UML Source section
1. Update the img src and edit link target to the current values

### Notes

* See the help docs for [PlantUML Activity Diagrams](https://plantuml.com/activity-diagram-beta) for syntax help.
