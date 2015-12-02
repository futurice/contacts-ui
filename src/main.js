/* global require: true */
import Cycle from "@cycle/core";
import { h, makeDOMDriver } from "@cycle/dom";
import { makeHTTPDriver } from "@cycle/http";
const { div, span, a, table, thead, tbody, tr, th, td, img, sup } =
  require("hyperscript-helpers")(h);
const Rx = Cycle.Rx;

const FUM_BASEURL = "%%%FUM_BASEURL%%%";
const AVATAR_BASEURL = "%%%AVATAR_BASEURL%%%";
const CONTACTS_URL = "/contacts.json";

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

const dataImg = (avatars, url) => {
  return img({
    src: AVATAR_BASEURL + "/avatar?url=" + encodeURIComponent(url),
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

const flowdockAvatar = (avatars, t) => tri(t, (fd) =>
  a({ href: "https://www.flowdock.com/app/private/" + fd.id }, [
    dataImg(avatars, fd.avatar),
  ]));

const flowdock = (t) => triDagger(t, (fd) =>
  a({ href: "https://www.flowdock.com/app/private/" + fd.id }, [
    fd.nick,
  ]));

const githubAvatar = (avatars, t) => tri(t, (gh) =>
  a({ href: "https://github.com/" + gh.nick }, [
    dataImg(avatars, gh.avatar),
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
    th(),
    th("Flowdock"),
    th(),
    th("GitHub"),
    th("Mail"),
    th("Title"),
  ]);

const strContains = (str, needle) =>
  str.toLowerCase().indexOf(needle.toLowerCase()) !== -1;

const triMatches = (t, f) =>
  (t.tag === "sure" || t.tag === "unsure") && f(t.contents);

const contactMatches = (contact, needle) =>
  needle.length < 3 ||
    strContains(contact.name, needle) ||
    triMatches(contact.flowdock, fd => strContains(fd.nick, needle)) ||
    triMatches(contact.github, gh => strContains(gh.nick, needle));

const contactMatchesStyle = (contact, needle) =>
  ({ display: contactMatches(contact, needle) ? "table-row" : "none" });

const renderRow = (avatars, needle) => (contact) =>
  tr({ style: contactMatchesStyle(contact, needle) }, [
    td(dataImg(avatars, contact.thumb)),
    td(a({ href: FUM_BASEURL + "/fum/users/" + contact.login }, contact.name)),
    td(separatedBy(contact.phones.map(renderPhone), " ")),
    td(flowdockAvatar(avatars, contact.flowdock)),
    td(flowdock(contact.flowdock)),
    td(githubAvatar(avatars, contact.github)),
    td(github(contact.github)),
    td(a({ href: "mailto:" + contact.email }, "email")),
    td(contact.title),
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

const renderTable = (contacts, avatars, needle) =>
  table([
    thead(tableHeader),
    tbody(
      contacts.map(renderRow(avatars, needle)),
    ),
  ]);

const renderSpinner =
  div(".loader", "Loading...");

const render = (contacts, avatars, needle) =>
  div([
    issueReports,
    filterBar,
    contacts.length === 0 ?
      renderSpinner :
      renderTable(contacts, avatars, needle),
    footer,
  ]);

const main = (responses) => {
  const requests$ = Rx.Observable.merge(
    Rx.Observable.just(CONTACTS_URL));

  const filter$ = responses.DOM
    .select(".filter").events("input")
    .map(ev => ev.target.value)
    .startWith("")
    .map(needle => needle.trim().length < 3 ? "" : needle.trim())
    .distinctUntilChanged();

  const contacts$ = responses.HTTP
    .filter(res$ => res$.request.indexOf(CONTACTS_URL) === 0)
    .switch()
    .map(res => res.body)
    .startWith([]);

  const avatars$ = Rx.Observable.just(null);

  const vtree$ =
    Rx.Observable.combineLatest(contacts$, avatars$, filter$, render);

  return {
    DOM: vtree$,
    HTTP: requests$,
  };
};

Cycle.run(main, {
  DOM: makeDOMDriver("#main-container"),
  HTTP: makeHTTPDriver(),
});
