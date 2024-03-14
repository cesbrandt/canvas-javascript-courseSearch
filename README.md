# canvas-javascript-courseSearch
This is a userscript that adds a "Search" as the third item on the course navigation.

#### Table of Contents
 - [Changelog](#changelog)
 - [Dependencies](#dependencies)
 - [How-To Use](#how-to-use)

#### Changelog
03/14/2024
 - Initial Load

[Back to Top](#canvas-javascript-courseSearch)

#### Dependencies
- Userscript Manager
  - [Tampermonkey (Chrome)](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en)
  - [Tampermonkey (Firefox)](https://addons.mozilla.org/en-us/firefox/addon/tampermonkey/)
  - [Greasemonkey (Firefox)](https://addons.mozilla.org/en-us/firefox/addon/greasemonkey/)

[Back to Top](#canvas-javascript-courseSearch)

#### How-To Use
1. Load the userscript to your Userscript Manager of choice
2. Enable the userscript
3. Access the "Search" option on the course navigation in Canvas
   - Searching is case-insensitive
   - Search will look at:
      - Assignment descriptions
      - Discussion Topic messages (main topic message only)
      - Quiz descriptions
      - Page bodies
      - Module Item titles and URLs (external URLs and tools only)
   - Multiple search terms can be provided
   - Every word is treated as a separate search term (split by spaces)
   - Use double-quotation marks (") to provide a search phrase
   - Search results are sorted in order of:
      1. the combined total of matches of terms from highest-to-lowest
      2. the content type
          1. Assignments
          2. Discussion Topics
          3. Quizzes
          4. Pages
          5. Module Items
      3. the activity IDs

[Back to Top](#canvas-javascript-courseSearch)
