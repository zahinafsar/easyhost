# What is a presigned URL?

A presigned URL is a temporary link that grants one specific S3 action, such as uploading a single file, without sharing your secret keys.

## The short version

A presigned URL is a temporary link that grants one specific S3 action, such as uploading a single file, without sharing your secret keys. Your server signs the URL, then the browser uses it directly. Uploads skip your server, which saves memory and bandwidth. Set a short expiry, because anyone holding the link can use it until then.

## On EasyHost

The storage guides on this site use presigned uploads so large files stay out of your 512 MB container. [Learn more](/products/storage).
