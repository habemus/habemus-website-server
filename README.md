# H-website

Responsible for
  - registering relationships between domains and a project
  - verifying the validity of registered domains
  - resolving domain names into information regarding where the served files are stored
  - resolving domain names into information regarding other domains that are related to the
    same storage

A `website` is the relationship between a public domain (e.g. `www.example.com`) and a
set of files to be served under that domain.

Inside habemu's context, that means a domain is related to a project - and potentially a 
specific version of that project.

There are two kinds of domain resolution: habemus' domains (e.g. `project-code.habemus.website`) that are managed internally by habemus and custom domains (e.g. `mywebsite.com`)

## Habemus domains

Habemus domains are domains that follow a habemus-specified pattern. In the pattern the
project's code MUST be clearly identifiable. Habemus domains relate to their respective
projects through the projects' `code` attribute.

As project codes are managed at `h-project`, `h-website` MUST consult `h-project` for 
retrieving information on the project by sending it the project's code.

`h-website` MUST NOT store project codes, as these are mutable and synchronization strategies
have been discarded.

## Habemus versioned domains

Habemus versioned domains are domains that follow a habemus-specified pattern. The pattern 
clearly identifies the project's code and the project's version code. Thus the versioned domain is associated to a specific project AND projectVersion.

To make the difference clear: habemus domains automatically resolve to the LATEST version,
while habemus versioned domains are immutable and always resolve to the same set of files.

## Custom domains

Custom domains are domains acquired by the user at registrars and whose DNS server the user
has access to.

In order to associate a custom domain to a project, the user must register the custom domain
as a domain that relates to a specific project's _id.

# h-website-deployer

h-website-deployer's only function is to resolve a projectId into a website and forward
the deploy request to all h-website-servers. This architecture enables the deployment
process to be modeled as a worker queue (with message guaranteed to be queued and executed by some h-website instance) and that the communication with the multiple instances of h-website-server to be modeled as an event (so that the publishing of
the message does not necessary queue it anywhere)

# Custom domain verification process


## Statuses

Domain records may be in 5 statuses:

`pending-verification` - when the record verification process still has not started.
`verifying` - when the record verification has started and is in process
`active` - when the verification process succeeds
`veritication-failed` - when the verification process failed and will be rescheduled in the future
`verification-failed-permanently` - when the verification process has passed its deadline and thus has failed permanently and won't be rescheduled
`scheduled-for-removal` - currently not in use, but should indicate that the domain record is scheduled to be removed in some time in the future

## Cron jobs

The domain verification system works based on two cron jobs:
`verifier`: responsible for loading domains at `pending-verification` and `verifying` statuses and running DNS config verifications.
`rescheduler`: responsible for rescheduling domain records at `verification-failed` for verification. By "rescheduling" we mean to reset the verification results and setting the domain record's status to `pending-verification`.

## Process

The verification process checks whether the domain's DNS configurations matches the required ones. The requirements are:
- `A` DNS records pointing to the correct host servers' IP addresses
- `CNAME` (in case `enableWwwAlias` === `true`) record should be pointing towards the domain without `www.`. E.g. `www.my-domain.com` -> `my-domain.com`.
- `TXT` DNS record at `habemus-verify.my-domain.com` with the correct verification code

As DNS configurations may take time to be propagated after they are configured in their DNS servers, the verification process checks for the configuration multiple times before either activating the record or marking it as failed.

At least `options.domainVerificationSampleSize` (defaults to 10) verifications MUST be run and of that number of verifications, at least `options.domainActivationThreshold` % of verifications MUST have succeeded for the domain record to be activated. If the `domainActivationThreshold` is reached but the success rate is below the `domainActivationThreshold`, the domain goes to the `verification-failed` status.

At that status, the domain will not be verified by the `verifier` cron job, it must be rescheduled by the `rescheduler` cron job.

## Expiration

Each domain record has an attribute `verificationStartedAt` that indicates when the verification process started. After `options.domainVerificationExpiresIn` milliseconds from that date, the domain verification will be considered expired and its status will be set to `verification-permanently-failed`.

Domain records at the `verification-permanently-failed` status will not be automatically rescheduled by the `rescheduler` job and MUST require manual action by the user.

## Emails

Upon verification success, the account related to the domain record will receive an email.
Upon verification permanent-fail, the account related to the domain record will receive an email.
