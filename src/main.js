/* global require: true */
import Cycle from "@cycle/core";
import { h, makeDOMDriver } from "@cycle/dom";
import { makeHTTPDriver } from "@cycle/http";
const { div, span, a, table, thead, tbody, tr, th, td, img } =
  require("hyperscript-helpers")(h);
const Rx = Cycle.Rx;

const FUM_BASEURL = "%%%FUM_BASEURL%%%";
const CONTACTS_URL = "/contacts.json";
const AVATARS_URL = "/avatars.json";

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

const dataImg = (avatars, d) => {
  const contents = avatars[d];

  if (contents) {
    return img({ src: "data:image/png;base64," + contents });
  } else {
    return span("");
  }
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

const flowdockAvatar = (avatars, t) => tri(t, (fd) =>
  a({ href: "https://www.flowdock.com/app/private/" + fd.id }, [
    dataImg(avatars, fd.avatar),
  ]));

const flowdock = (t) => tri(t, (fd) =>
  a({ href: "https://www.flowdock.com/app/private/" + fd.id }, [
    fd.nick,
  ]));

const githubAvatar = (avatars, t) => tri(t, (gh) =>
  a({ href: "https://github.com/" + gh.nick }, [
    dataImg(avatars, gh.avatar),
  ]));

const github = (t) => tri(t, (gh) =>
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

const renderRow = (avatars) => (contact) =>
  tr([
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

const render = (contacts, avatars) =>
  div([
    issueReports,
    filterBar,
    table([
      thead(tableHeader),
      tbody(
        contacts.map(renderRow(avatars)),
      ),
    ]),
  ]);

const main = (responses) => {
  const requests$ = Rx.Observable.merge(
    Rx.Observable.just(CONTACTS_URL),
    Rx.Observable.just(AVATARS_URL));

  const filter$ = responses.DOM
    .select(".filter").events("input")
    .map(ev => ev.target.value)
    .startWith("");

  const contacts$ = responses.HTTP
    .filter(res$ => res$.request.indexOf(CONTACTS_URL) === 0)
    .switch()
    .map(res => res.body)
    .startWith([]);

  const avatars$ = responses.HTTP
    .filter(res$ => res$.request.indexOf(AVATARS_URL) === 0)
    .switch()
    .map(res => res.body)
    .startWith({});

  const vtree$ = Rx.Observable.combineLatest(contacts$, avatars$, filter$,
    (contacts, avatars, needle) => {
      const contacts_ = needle.length < 3 ? contacts : contacts.filter(contact =>
          contact.name.toLowerCase().indexOf(needle.toLowerCase()) !== -1);

      return render(contacts_, avatars);
    });

  return {
    DOM: vtree$,
    HTTP: requests$,
  };
};

Cycle.run(main, {
  DOM: makeDOMDriver("#main-container"),
  HTTP: makeHTTPDriver(),
});
