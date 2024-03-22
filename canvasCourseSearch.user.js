// ==UserScript==
// @name          Canvas Course Search
// @description   Adds a much needed search feature to Canvas LMS courses.
// @version       0.5
// @match         https://*.instructure.com/courses/*
// @downloadURL   https://raw.githubusercontent.com/cesbrandt/canvas-javascript-courseSearch/master/canvasCourseSearch.user.js
// @updateURL     https://raw.githubusercontent.com/cesbrandt/canvas-javascript-courseSearch/master/canvasCourseSearch.user.js
// @grant         none
// ==/UserScript==

const delay = ms => new Promise(res => setTimeout(res, ms));

/**
 * @name          Build Variable Object
 * @description   Creates an object of GET variables and their values from a supplied URL
 * @return obj    Object of GET variables and their values
 */
String.prototype.buildVarObj = function() {
	var varObj = {};
	var vars = this.split('?');

	if(vars.length > 1) {
		vars = vars[1].split('&');
		for(var i in vars) {
			vars[i] = vars[i].split('=');
			varObj[vars[i][0]] = vars[i][1];
		}
	}

	return varObj;
};

/**
 * @name               Is Object or Array Empty?
 * @description        Generic function for determing if a JavaScript object or array is empty
 * @return undefined
 */
let isEmpty = obj => {
	if(Object.prototype.toString.call(obj) == '[object Array]') {
		return obj.length > 0 ? false : true;
	} else {
		for(var key in obj) {
			if(obj.hasOwnProperty(key)) {
				return false;
			}
		}

		return true;
	}
};

/**
 * @name          Extend Arrays/Objects
 * @description   Extends two arrays/objects
 * @return array/object
 */
let extend = (one, two) => {
	var extended;

	if(Object.prototype.toString.call(one) == '[object Object]' || Object.prototype.toString.call(two) == '[object Object]') {
		extended = {};
		for(var key in one) {
			extended[key] = one[key];
		}
		for(key in two) {
			extended[key] = two[key];
		}
	} else {
		extended = one;
		var i = extended.length;
		for(var j in two) {
			extended[i++] = two[j];
		}
	}

	return extended;
};

/**
 * @name          Data-to-HTTP
 * @description   Converts an object to HTTP parameters
 * @return string
 */
let dataToHttp = obj => {
	var pairs = [];

	for(var prop in obj) {
		if(!obj.hasOwnProperty(prop)) {
			continue;
		}
		if(Object.prototype.toString.call(obj[prop]) == '[object Object]') {
			pairs.push(dataToHttp(obj[prop]));
			continue;
		}
		pairs.push(prop + '=' + obj[prop]);
	}

	return pairs.join('&');
};

/**
 * @name          Format Cookie Name
 * @description   Returns cookie name formatted for site
 * @return string
 */
let formatCookieName = name => {
	return url.match(/(?!\/\/)[a-zA-Z1-3]*(?=\.)/) + '_' + view + (viewID !== null ? '_' + viewID : '') + '_' + escape(name);
};

/**
 * @name          Get Cookie by Name
 * @description   Returns cookie value
 * @return string
 */
let getCookie = (name, format) => {
	let value = document.cookie.match('(^|[^;]+)\\s*' + (typeof format !== 'undefined' && format ? formatCookieName(name) : name) + '\\s*=\\s*([^;]+)');

	return value !== null && value !== '' ? decodeURIComponent(value.pop()) : null;
};

/**
 * @name          API Call
 * @description   Calls the Canvas API
 * @return undefined
 */
let callAPI = async (type, context, page, getVars, oncomplete, oncompleteInput, lastPage, firstCall, next) => {
	let validContext = Object.prototype.toString.call(context);
	var callURL = url.split('/' + view + '/')[0] + '/api/v1';

	if(validContext) {
		context.forEach(contextLevel => {
			callURL += '/' + contextLevel;
		});
	}

	var i, j;
	if(type == 'GET' && callURL.match(/progress/) === null) {
		let audit = callURL.match(/audit/) !== null ? true : false;
		getVars = getVars === null ? [{}] : getVars;
		oncompleteInput = oncompleteInput === null ? output => {
			console.log(output);
		} : oncompleteInput;
		firstCall = typeof firstCall != 'undefined' ? firstCall : [{}];

		var expandedVars = getVars.slice(0);
		page = typeof page === 'undefined' ? (audit ? 'first' : 1) : page;
		expandedVars[0].page = page;
		expandedVars[0].per_page = 100;

		var callsToMake = { callURL: callURL, data: extend({}, expandedVars[0]) };
		if(page === 1 || audit || lastPage === -1) {
			callAJAX(type, callURL, expandedVars[0]).then(response => {
				var json = JSON.parse(response.data.replace('while(1);', ''));

				if(response.status != 200) {
					oncomplete({ error: 'There was an error. Please try again.' });
				} else {
					json = audit ? json.events : json;
					let results = (firstCall.length == 1 && isEmpty(firstCall[0])) ? json : extend(firstCall, json);
					if(json.length === 100) {
						if(!audit) {
							page++;
							lastPage = -1;
							next = true;
						} else {
							page = response.headers.link.match(/\bpage=[^&]*(?=[^>]*>; rel="next")/)[0].split('=')[1];
							lastPage = null;
							next = false;
						}
						callAPI(type, context, page, getVars, oncomplete, oncompleteInput, lastPage, results, next);
					} else {
						oncomplete(results, oncompleteInput);
					}
				}
			});
		} else {
			var limit = 25;
			var k = 0;

			for(i = page + 1; i <= lastPage; k = 0) {
				var currentCallsToMake = i == page + 1 ? [JSON.parse(JSON.stringify(callsToMake))] : [];
				for(k; currentCallsToMake.length < limit; k++) {
					var newCTM = JSON.parse(JSON.stringify(callsToMake));
					newCTM.data.page = i++;
					currentCallsToMake.push(newCTM);
					if(i >= lastPage) {
						break;
					}
				}

				var currentCalls = currentCallsToMake.map(currentSettings => {
					return callAJAX(type, currentSettings.callURL, currentSettings.data);
				});
				await Promise.all(currentCalls).then(results => {
					for(j = 0; j < results.length; j++) {
						let json = JSON.parse(results[j].data.replace('while(1);', ''));
						if(Array.isArray(json)) {
							firstCall = extend(firstCall, json);
						}
					}
				});
			}
			oncomplete(firstCall, oncompleteInput);
		}
	} else {
		callAJAX(type, callURL, getVars).then(response => {
			oncomplete(JSON.parse(response.data.replace('while(1);', '')), oncompleteInput);
		});
	}

	return;
};

/**
 * @name          AJAX Call
 * @description   Calls the the specified URL with supplied data
 * @return obj    Full AJAX call is returned for processing elsewhere
 */
let callAJAX = async (type, callURL, data) => {
	var res;
	if(type == 'GET') {
		res = await fetch(callURL + '?' + dataToHttp(data), {
			headers: {
				'Content-Type': 'application/json;charset=utf-8',
				'X-CSRF-Token': getCookie('_csrf_token')
			}
		});
	} else {
		res = await fetch(callURL, {
			headers: {
				'Content-Type': 'application/json;charset=utf-8',
				'X-CSRF-Token': getCookie('_csrf_token')
			},
			method: type,
			body: JSON.stringify(data[0])
		});
	}

	var status = await res.status;
	var headers = {};
	for(let entry of res.headers.entries()) {
		headers[entry[0]] = entry[1];
	}
	var body = await res.text();

	return { status: status, headers: headers, data: body };
};

var url = window.location.href;
var server = url.match(/(?!abc123\.)((beta|test)\.)?(?=instructure\.com)/)[0].replace('.', '');
server = server === '' ? 'live' : server;

var leveledURL = window.location.pathname.split('/');
var view = url.match(/\.com\/?$/) ? 'dashboard' : leveledURL[1];
view = view.match(/^\?/) ? 'dashboard' : view;
var viewID = (view !== 'dashboard' && typeof leveledURL[2] !== 'undefined') ? leveledURL[2] : null;
var subview = (viewID !== null && typeof leveledURL[3] !== 'undefined') ? leveledURL[3].split('#')[0] : null;
var subviewID = (subview !== null && typeof leveledURL[4] !== 'undefined') ? leveledURL[4].split('#')[0] : null;
var terview = (viewID !== null && typeof leveledURL[5] !== 'undefined') ? leveledURL[5].split('#')[0] : null;
var GETS = url.buildVarObj();

var navigation;

let init = async () => {
	// Build page
	if(subview == 'search') {
		await buildPage();
	}

	updateNav();
};

let getMatches = (body, query) => {
	var matches = body.match(new RegExp('(\\w*\\s+)?[^\\s]*(' + query.join('|') + ')[^\\s]*(\\s+\\w*)?', 'gi'));

	if(matches !== null) {
		for(var i = 0; i < matches.length; i++) {
			query.forEach(val => {
				var originalVal = matches[i].match(new RegExp(val, 'gi'));
				matches[i] = matches[i].replace(originalVal, '<strong><em>' + originalVal + '</em></strong>');
			});
		}
	}

	return matches;
};

let buildPage = async () => {
	await fetch(window.location.origin + window.location.pathname.replace('/' + window.location.pathname.split('/')[window.location.pathname.split('/').length - 1], '')).then(resp => {
		return resp.text();
	}).then(html => {
		var parser = new DOMParser();
		var doc = parser.parseFromString(html, 'text/html');

		// Update page title
		document.querySelector('head title').innerText = 'Search Course: ' + doc.querySelector('head title').innerText;

		// Add breadcrumbs
		var main = document.querySelector('#main');
		main.previousSibling.remove();
		var breadcrumbs = doc.querySelector('#wrapper .ic-app-nav-toggle-and-crumbs').cloneNode(true);
		breadcrumbs.querySelector('#breadcrumbs li:last-of-type span').innerText = 'Search Course';
		main.before(breadcrumbs);

		// Add course nav
		main = main.querySelector('#not_right_side');
		if(doc.querySelector('body').classList.contains('course-menu-expanded')) {
			document.querySelector('body').classList.add('course-menu-expanded');
		}
		main.before(doc.querySelector('#left-side').cloneNode(true));
		document.querySelector('#left-side').style.overflow = 'hidden';
		navigation = document.querySelector('nav[aria-label="Courses Navigation Menu"]');

		// Add body
		main = main.querySelector('#content');
		main.innerHTML = '<div class="ic-Action-header"><div class="ic-Action-header__Primary"><h2 class="ic-Actiong-header__Headering">Search Course</div></div></div><div class="user_content enhanced"><input type="text" name="course_search" id="course_search" placeholder="Search string..." /><button type="button" id="search_btn" class="Button">Search</button></div><div id="search_results" class="user_content enhanced"></div>';
		var search = main.querySelector('#course_search');
		var searchBtn = main.querySelector('#search_btn');
		searchBtn.style.marginLeft = getComputedStyle(search).getPropertyValue('padding-right');
		search.style.width = 'calc(100% - ' + getComputedStyle(search).getPropertyValue('border-left-width') + ' - ' + getComputedStyle(search).getPropertyValue('border-right-width') + ' - ' + getComputedStyle(search).getPropertyValue('padding-left') + ' - ' + getComputedStyle(search).getPropertyValue('padding-right') + ' - ' + getComputedStyle(searchBtn).getPropertyValue('margin-left') + ' - ' + (searchBtn.offsetWidth + 1) + 'px)';
		searchBtn.style.marginBottom = getComputedStyle(search).getPropertyValue('margin-bottom');

		// Search the course content via API
		let runSearch = async () => {
			// Retrueve course content
			var content = {
				Assignment: {},
				Discussion: {},
				Quiz: {},
				Page: {},
				ModuleItem: {}
			};
			await callAPI('GET', [view, viewID, 'assignments'], 1, [{}], async assignments => {
				if(Array.isArray(assignments)) {
					assignments.forEach(assignment => {
						content.Assignment[assignment.id] = assignment;
					});
				}
				await callAPI('GET', [view, viewID, 'discussion_topics'], 1, [{}], async discussion_topics => {
					if(Array.isArray(discussion_topics)) {
						discussion_topics.forEach(discussion_topic => {
							content.Discussion[discussion_topic.id] = discussion_topic;
						});
					}
					await callAPI('GET', [view, viewID, 'quizzes'], 1, [{}], async quizzes => {
						if(Array.isArray(quizzes)) {
							quizzes.forEach(quiz => {
								content.Quiz[quiz.id] = quiz;
							});
						}
						await callAPI('GET', [view, viewID, 'pages'], 1, [{ 'include': ['body'] }], async pages => {
							if(Array.isArray(pages)) {
								pages.forEach(page => {
									content.Page[page.page_url] = page;
								});
							}
							await callAPI('GET', [view, viewID, 'modules'], 1, [{ 'include': ['items'] }], async modules => {
								if(Array.isArray(modules)) {
									var call = 0;
									for(var i = 0; i < modules.length; i++) {
										var module = modules[i];
										for(var j = 0; j < module.items.length; j++) {
											var item = module.items[j];
											switch(item.type) {
												case 'ExternalUrl':
												case 'ExternalTool':
													content.ModuleItem[item.id] = item;
													break;
												case 'Assignment':
												case 'Discussion':
												case 'Quiz':
												case 'Page':
													var type = '';
													if(item.type == 'Assignment') {
														type = 'assignments';
													} else if(item.type == 'Discussion') {
														type = 'discussion_topics';
													} else if(item.type == 'Quiz') {
														type = 'quizzes';
													} else if(item.type == 'Page') {
														type = 'pages';
													}
													if(content[item.type][item.content_id] == undefined) {
														var id = item.type == "Page" ? item.page_url : item.content_id;
														await callAPI('GET', [view, viewID, type, id], 1, [{ 'include': ['body'] }], itemContent => {
															content[item.type][id] = itemContent;
														});
														await delay(500);
													}
													break;
											}
										}
									}
								}
								console.log(content);

								// Parse search query
								var query = search.value.match(/(".*?"|[^"\s]+)+(?=\s*|\s*$)/g);
								for(i = 0; i < query.length; i++) {
									query[i] = query[i].replaceAll('"', '');
								}

								// Search content
								var matches = [], lookup;
								var parser = new DOMParser();
								var doc = parser.parseFromString(html, 'text/html');
								for(id in content.Assignment) {
									var assignment = content.Assignment[id];
									lookup = getMatches(parser.parseFromString(assignment.description, 'text/html').querySelector('body').innerText, query);
									if(lookup !== null) {
										matches.push({ id: assignment.id, type: 'assignment', name: assignment.name, matches: lookup });
									}
								}
								for(id in content.Discussion) {
									var discussion_topic = content.Discussion[id];
									lookup = getMatches(parser.parseFromString(discussion_topic.message, 'text/html').querySelector('body').innerText, query);
									if(lookup !== null) {
										matches.push({ id: discussion_topic.id, type: 'discussion_topic', name: discussion_topic.title, matches: lookup });
									}
								}
								for(id in content.Quiz) {
									var quiz = content.Quiz[id];
									lookup = getMatches(parser.parseFromString(quiz.description, 'text/html').querySelector('body').innerText, query);
									if(lookup !== null) {
										matches.push({ id: quiz.id, type: 'quiz', name: quiz.title, matches: lookup });
									}
								}
								for(id in content.Page) {
									var page = content.Page[id];
									lookup = getMatches(parser.parseFromString(page.body, 'text/html').querySelector('body').innerText, query);
									if(lookup !== null) {
										matches.push({ id: page.url, type: 'page', name: page.title, matches: lookup });
									}
								}
								for(id in content.ModuleItem) {
									var moduleItem = content.ModuleItem[id];
									lookup = getMatches(moduleItem.external_url, query);
									if(lookup !== null) {
										matches.push({ id: moduleItem.id, type: moduleItem.type, name: moduleItem.title, matches: lookup });
									}
								}

								// Build and display the results
								var results = '<table class="ic-Table ic-Table--condensed"><tbody>';
								matches.sort((a, b) => {
									return b.matches.length - a.matches.length;
								}).forEach(match => {
									var type, icon, url;
									switch(match.type) {
										case 'assignment':
											type = 'Assignment';
											icon = 'assignment';
											url = 'assignments';
											break;
										case 'discussion_topic':
											type = 'Discussion Topic';
											icon = 'discussion';
											url = 'discussion_topics';
											break;
										case 'quiz':
											type = 'Quiz';
											icon = 'quiz';
											url = 'quizzes';
											break;
										case 'page':
											type = 'Page';
											icon = 'document';
											url = 'pages';
											break;
										case 'ExternalUrl':
											type = 'External URL';
											icon = 'link';
											url = 'modules/items';
											break;
										case 'ExternalTool':
											type = 'External Tool';
											icon = 'link';
											url = 'modules/items';
											break;
									}
									if(type != undefined && type != null) {
										results += '<tr><td><span class="screenreader-only">' + type + '</span><i role="presentation" class="icon-' + icon + '"></i> &nbsp; <a href="/courses/' + viewID + '/' + url + '/' + match.id + '">' + match.name + '</a><br />... ' + match.matches.join(' ... ') + ' ...</td></tr>';
									}
								});
								main.querySelector('#search_results').innerHTML = results + '</tbody></table>';
							});
						});
					});
				});
			});
		};
		searchBtn.addEventListener('click', () => {
			if(search.value != '') {
				runSearch();
			}
		});
		window.addEventListener('keydown', function(e) {
			if(e.keyCode == 13 && e.target == search && search.value != '') {
				runSearch();
			}
		});
	});
};

let updateNav = () => {
	navigation = document.querySelector('nav[aria-label="Courses Navigation Menu"]');

	// Add search to navigation
	var announcementsLink = navigation.querySelector('.section:nth-of-type(2)');
	var searchLink = announcementsLink.cloneNode(true);
	searchLink.classList.remove('section-hidden');
	searchLink.querySelector('a').setAttribute('aria-label', 'Search Course Content');
	searchLink.querySelector('a').setAttribute('class', 'search');
	searchLink.querySelector('a').removeAttribute('title');
	searchLink.querySelector('a').href = '/' + view + '/' + viewID + '/search';
	searchLink.querySelector('a').innerHTML = 'Search';
	announcementsLink.after(searchLink);

	// Set search as active
	if(subview == 'search') {
		navigation.querySelectorAll('a.active').forEach(lnk => {
			lnk.classList.remove('active');
		});
		navigation.querySelector('a.search').classList.add('active');
	}
};

init();
