Legacy Report Attachments
=========================

Script to import comments and file attachments from Smartsheet ARs.

Configuration
-------------

### Environment Variables

To run, the following three ENV vars must be set:

* `SMARTSHEET_API_TOKEN` api token for smartsheet, must have access to all 12 region AR sheets
* `SMARTHUB_SESSION_COOKIE` the session cookie for a smarthub admin with read access to all 12 regions
* `SMARTHUB_SESSION_SIG` the session.sig cooke for the same smarthub admin

### smartsheet.yml

This file contains the sheet ids for smartsheet activity report sheets

### Attachment::SMARTHUB_URI_BASE

This constant (set in `lib/attachment.rb`) is the base url of the smarthub

Running
-------

* Ensure ruby 2.7.2 is installed
* `bundle install`
* Set ENV vars
* `bundle exec rake run[REGION]` where `REGION` is the region number


example: `bundle exec rake run[1]`


Disclaimers
-----------

There are several attachments stored in onedrive that are behind additional login layers.
These will need to be imported by hand
