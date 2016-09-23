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
