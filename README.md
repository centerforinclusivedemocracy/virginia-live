# ccep-virginia-site

Vote Center Siting Tool for Virginia.

https://va.cidsitingtool.org/


## Hosting

Hosted on Github Pages. See the `CNAME` file which matches to the website hostname.


## Website Development

Development of this website requires Python, either 2 or 3. This is used to run a development web server so you can see your changes, as well as the `compile.py` script which assembles the files.

To start the web server, run either of the command below depending on your Python version, then open a web browser to http://localhost:9632/

```
# if you have Python 3
python3 -m http.server 9430

# if you have Python 2
python -m SimpleHTTPServer 9430
```

To make changes to the website, edits should be made to the files under `src/` which are the individual bits of HTML/CSS/JS code for each page. This includes a CSS stylesheet and a JavaScript file for each page, plus a shared header & footer that will be incorporated into each page.

To see your edits, run `python compile.py` or `python3 compile.py` (depending on your Python version) to assemble the web site.


## Deploying to Github

To deploy the changes, make your edits and use `compile.py` until your site looks right, then push the changes to the website. Then process would look something like this:

```
# review changed files or the specific changes, see if they look right
git status
git diff

# add and commit; use a brief but meaningful message about what you changed
git add .
git commit -m "made changes to the website"

# send it back to Github
git push
```
