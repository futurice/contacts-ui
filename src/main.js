/* global require: true */
import _ from "lodash";
import Cycle from "@cycle/core";
import { h, makeDOMDriver } from "@cycle/dom";
import { makeHTTPDriver } from "@cycle/http";
const { div, span, a, table, thead, tbody, tr, th, td, img, sup } =
  require("hyperscript-helpers")(h);
const Rx = Cycle.Rx;

const CONFIG_URL = "/config.json";
const CONTACTS_URL = "/api/contacts.json";

/*
// Haskell-y helper
const traceShowId = (x) => {
  console.log(x);
  return x;
};
*/

// foundation helpers
const row = (elems) =>
  div(".row", elems);

const cell = (width, elems) =>
  div(".columns.large-" + width, elems);

const wholerow = (elems) =>
  row(cell(12, elems));

// rest

const renderPhone = (phone) => {
  return a({ href: "tel:" + phone }, phone);
};

const separatedBy = (arr, sep) => {
  if (arr.length === 0) {
    return [];
  } else {
    const res = [arr[0]];
    for (let i = 1; i < arr.length; i++) {
      res.push(sep);
      res.push(arr[i]);
    }
    return res;
  }
};

const dataImg = (config, avatars, url) => {
  return img({
    src: config.AVATAR_BASEURL + "/avatar?url=" + encodeURIComponent(url),
    width: 32,
    height: 32,
  });
};

const tri = (d, f) => {
  switch (d.tag) {
  case "unsure":
    return span(".unsure", f(d.contents));
  case "sure":
    return f(d.contents);
  default: // case "unknown":
    return span("");
  }
};

const triDagger = (d, f) => {
  switch (d.tag) {
  case "unsure":
    return span(".unsure", [
      f(d.contents),
      a({ href: "#dagger" }, sup("†")),
    ]);
  case "sure":
    return f(d.contents);
  default: // case "unknown":
    return span("");
  }
};

const flowdockAvatar = (config, avatars, t) => tri(t, (fd) =>
  a({ href: "https://www.flowdock.com/app/private/" + fd.id }, [
    dataImg(config, avatars, fd.avatar),
  ]));

const flowdock = (t) => triDagger(t, (fd) =>
  a({ href: "https://www.flowdock.com/app/private/" + fd.id }, [
    fd.nick,
  ]));

const githubAvatar = (config, avatars, t) => tri(t, (gh) =>
  a({ href: "https://github.com/" + gh.nick }, [
    dataImg(config, avatars, gh.avatar),
  ]));

const github = (t) => triDagger(t, (gh) =>
  a({ href: "https://github.com/" + gh.nick }, [
    gh.nick,
  ]));

const issueReports =
  span([
    "This service is still in flux, please fill bug reports and features requests at ",
    a({ href: "https://github.com/futurice/contacts-ui" }, "futurice/contacts-ui"),
  ]);

const filterBar =
  div("#searchbar", [
    h("input.filter", { attributes: {
      type: "text",
      placeholder: "Enter at least three characters to filter ",
    }}),
  ]);

const tableHeader =
  tr([
    th(),
    th("Name"),
    th("Phone"),
    th("Team"),
    th(),
    th("Flowdock"),
    th(),
    th("GitHub"),
    th("Mail"),
    th("Title"),
    th("Competence"),
  ]);

const normalizeNFD = (str) =>
    typeof str.normalize === "function" ? str.normalize("NFD") : str;

const canonicalize = (str) =>
    normalizeNFD(str.replace("ø", "o")).toLowerCase();

const strContains = (str, needle) =>
  canonicalize(str).indexOf(canonicalize(needle)) !== -1;

const triMatches = (t, f) =>
  (t.tag === "sure" || t.tag === "unsure") && f(t.contents);

const contactMatches = (contact, needle) =>
  needle.length < 3 ||
    strContains(contact.name, needle) ||
    triMatches(contact.flowdock, fd => strContains(fd.nick, needle)) ||
    triMatches(contact.github, gh => strContains(gh.nick, needle));

const contactMatchesStyle = (contact, needle) =>
  ({ display: contactMatches(contact, needle) ? "table-row" : "none" });

const lastWord = (str) => {
  if (!str) { return ""; }

  const words = str.split(" ");
  return words.length === 0 ? "" : words[words.length - 1];
};

const prettyCompetence = (str) =>
    (str || "").replace(" (Primary", "");

const renderRow = (config, avatars, needle, firstNameOnly) => (contact) =>
  tr({ style: contactMatchesStyle(contact, needle) }, [
    td(a({ href: config.FUM_BASEURL + "/fum/users/" + contact.login }, dataImg(config, avatars, contact.thumb))),
    td(a({ href: config.FUM_BASEURL + "/fum/users/" + contact.login }, contact[firstNameOnly ? "first" : "name"])),
    td(separatedBy(contact.phones.map(renderPhone), " ")),
    td((contact.team || "").replace(/^\d+-/, "")),
    td(flowdockAvatar(config, avatars, contact.flowdock)),
    td(flowdock(contact.flowdock)),
    td(githubAvatar(config, avatars, contact.github)),
    td(github(contact.github)),
    td(a({ href: "mailto:" + contact.email }, "email")),
    td(firstNameOnly ? lastWord(contact.title) : contact.title),
    prettyCompetence(contact.competence),
  ]);

const footer =
  div("#footer", [
    a({ name: "dagger" }),
    sup("†"),
    " Entries in ",
    span(".unsure", "red"),
    " are unsure. The information is not from FUM or seems to be wrong.",
    h("br"),
    sup("‡"),
    " Data is updated about once an hour.",
  ]);

const calculateStats = (contacts) => {
  const names = {};
  const titles = {};
  contacts.forEach((contact) => {
    const name = contact.first;
    const title = lastWord(contact.title).toLowerCase();

    names[name] = (names[name] || 0) + 1;
    titles[title] = (titles[title] || 0) + 1;
  });

  return {
    names: names,
    titles: titles,
  };
};

const renderStatsTable = (stats) => {
  const pairs = _.chain(stats)
    .map((v, k) => [k, v])
    .filter(([k, v]) => v > 1 && k !== "")
    .sortBy((x) => -x[1]) // ([_k, v]) => -v
    .value();

  return table(".statstable", [
    pairs.map(([k, v]) => tr([
      td(k),
      td("" + v),
    ])),
  ]);
};

const renderStatsTables = (stats) =>
  div([
    renderStatsTable(stats.names),
    renderStatsTable(stats.titles),
  ]);

const renderTable = (config, contacts, avatars, needle, firstNameOnly) =>
  table([
    thead(tableHeader),
    tbody(
      contacts.map(renderRow(config, avatars, needle, firstNameOnly))
    ),
  ]);

// let's not name tribes "external' ;)
const countExternals = (contacts) =>
  _.chain(contacts)
    .filter((c) => (c.team || "").match(/external/i))
    .value()
    .length;

const renderCounts = (contacts) => {
  const total = contacts.length;
  const exts = countExternals(contacts);
  return div("There are " + (total - exts) + " futuriceans and " + exts + " externals.");
};

const renderSpinner =
  div(".loader", "Loading...");

const contactsRender = (config, contacts, avatars, needle, firstNameOnly) =>
  div([
    wholerow(issueReports),
    row(cell(6, filterBar)),
    row(cell(12, renderCounts(contacts))),
    wholerow(contacts.length === 0 ?
      renderSpinner :
      renderTable(config, contacts, avatars, needle, firstNameOnly)),
    firstNameOnly ? wholerow(renderStatsTables(calculateStats(contacts))) : null,
    wholerow(footer),
  ]);

const mosaicImage = (config, contact) =>
  a({ href: config.FUM_BASEURL + "/fum/users/" + contact.login }, [
    img({
      title: contact.name,
      width: 50,
      height: 50,
      src: config.AVATAR_BASEURL + "/avatar?size=50&grey&url=" + contact.thumb,
    }),
  ]);

const iddqdRender = (config, contacts) =>
  div("#mosaic",
    contacts
      .filter(contact => !contact.thumb.match(/default_portrait/))
      .map((x) => mosaicImage(config, x)));

const render = (config, contacts, avatars, needle, iddqd, firstNameOnly) =>
  iddqd ? iddqdRender(config, contacts) : contactsRender(config, contacts, avatars, needle, firstNameOnly);

const codeSource = (keyPresses, code) => keyPresses
  .map(ev => String.fromCharCode(ev.which))
  .bufferWithCount(code.length, 1)
  .map((arr) => arr.join(""))
  .skipWhile(str => str !== code)
  .map(() => true)
  .startWith(false);

const main = (responses) => {
  const requests$ = Rx.Observable.merge(
    Rx.Observable.just(CONFIG_URL),
    Rx.Observable.just(CONTACTS_URL));

  const config$ = responses.HTTP
    .filter(res$ => res$.request.indexOf(CONFIG_URL) === 0)
    .switch()
    .map(res => res.body);

  const filter$ = responses.DOM
    .select(".filter").events("input")
    .map(ev => ev.target.value)
    .startWith("")
    .map(needle => needle.trim().length < 3 ? "" : needle.trim())
    .distinctUntilChanged();

  const iddqd$ = codeSource(responses.keyPresses, "iddqd");
  const idclip$ = codeSource(responses.keyPresses, "idclip");

  const contacts$ = responses.HTTP
    .filter(res$ => res$.request.indexOf(CONTACTS_URL) === 0)
    .switch()
    .map(res => res.body)
    .startWith([]);

  const avatars$ = Rx.Observable.just(null);

  const vtree$ =
    Rx.Observable.combineLatest(config$, contacts$, avatars$, filter$, iddqd$, idclip$, render);

  return {
    DOM: vtree$,
    HTTP: requests$,
  };
};

Cycle.run(main, {
  DOM: makeDOMDriver("#main-container"),
  HTTP: makeHTTPDriver(),
  keyPresses: () => Rx.Observable.fromEvent(document, "keypress"),
});
