import {
  a,
  br,
  div,
  DOMSource,
  h,
  img,
  input,
  makeDOMDriver,
  span,
  sup,
  table,
  tbody,
  td,
  th,
  thead,
  tr,
  VNode,
} from "@cycle/dom";
import { HTTPSource, makeHTTPDriver } from "@cycle/http";
import { run } from "@cycle/run";
import * as _ from "lodash";
import xs, { Stream } from "xstream";
import dropRepeats from "xstream/extra/dropRepeats";
import fromEvent from "xstream/extra/fromEvent";

interface Config {
  AVATAR_BASEURL: string;
  FUM_BASEURL: string;
}

const CONFIG_URL = "/config.json";
const CONTACTS_URL = "/api/contacts.json";

type VDOM = VNode | VNode[];

// foundation helpers
const row = (elems: VDOM) => div(".row", elems);

const cell = (width: number, elems: VDOM) =>
  div(".columns.large-" + width, elems);

const wholerow = (elems: VDOM) => row(cell(12, elems));

// rest

const renderPhone = (phone: string) => {
  return a({ props: { href: "tel:" + phone } }, phone);
};

function separatedBy<T, S>(arr: T[], sep: S): Array<T | S> {
  if (arr.length === 0) {
    return [];
  } else {
    const res = [arr[0]] as Array<T | S>;
    for (let i = 1; i < arr.length; i++) {
      res.push(sep);
      res.push(arr[i]);
    }
    return res;
  }
}

function dataImg(config: Config, url: string) {
  const srcUrl = config.AVATAR_BASEURL === ""
    ? url
    : config.AVATAR_BASEURL + "/avatar?url=" + encodeURIComponent(url);
  return h("img", {
    props: {
      src: srcUrl,
      width: 32,
    },
  });
}

function maybeSpan<T>(x: T | undefined, f: (y: T) => VDOM) {
  if (x) {
    return f(x);
  } else {
    return span("");
  }
}

interface FlowdockUser {
  id: string;
  avatar: string;
  nick: string;
}

interface GithubUser {
  nick: string;
  avatar: string;
}

const flowdockAvatar = (config: Config, t?: FlowdockUser) =>
  maybeSpan(t, fd =>
    a({ props: { href: "https://www.flowdock.com/app/private/" + fd.id } }, [
      dataImg(config, fd.avatar),
    ]),
  );

const flowdock = (t?: FlowdockUser) =>
  maybeSpan(t, fd =>
    a({ props: { href: "https://www.flowdock.com/app/private/" + fd.id } }, [
      fd.nick,
    ]),
  );

const githubAvatar = (config: Config, t?: GithubUser) =>
  maybeSpan(t, gh =>
    a({ props: { href: "https://github.com/" + gh.nick } }, [
      dataImg(config, gh.avatar),
    ]),
  );

const github = (t?: GithubUser) =>
  maybeSpan(t, gh =>
    a({ props: { href: "https://github.com/" + gh.nick } }, [gh.nick]),
  );

const issueReports = span([
  "This service is still in flux, please fill bug reports and features requests at ",
  a(
    { props: { href: "https://github.com/futurice/contacts-ui" } },
    "futurice/contacts-ui",
  ),
]);

const filterBar = div("#searchbar", [
  input(".filter", {
    attributes: {
      placeholder: "Enter at least three characters to filter ",
      type: "text",
    },
  }),
]);

const tableHeader = tr([
  th(),
  th("Name"),
  th("Phone"),
  th("Team"),
  th("Office"),
  th(),
  th("Flowdock"),
  th(),
  th("GitHub"),
  th("Mail"),
  th("Title"),
  th("Competence"),
]);

const normalizeNFD = (str: string) =>
  typeof str.normalize === "function" ? str.normalize("NFD") : str;

const canonicalize = (str: string) =>
  normalizeNFD(str.replace("ø", "o")).toLowerCase();

const strContains = (str: string, needle: string) =>
  canonicalize(str).indexOf(canonicalize(needle)) !== -1;

function maybeMatches<T, R>(t: T | undefined, f: (t: T) => R): false | R {
  if (t) {
    return f(t);
  } else {
    return false;
  }
}

interface Contact {
  name: string;
  flowdock?: FlowdockUser;
  github?: GithubUser;
  login: string;
  first: string;
  last: string;
  team: string;
  phones: string[];
  email: string;
  title: string;
  competence: string;
  office: string;
  thumb: string;
  external: boolean;
}

const contactMatches = (contact: Contact, needle: string) =>
  needle.length < 3 ||
  strContains(contact.name, needle) ||
  maybeMatches(contact.flowdock, fd => strContains(fd.nick, needle)) ||
  maybeMatches(contact.github, gh => strContains(gh.nick, needle));

const contactMatchesStyle = (contact: Contact, needle: string) => ({
  display: contactMatches(contact, needle) ? "table-row" : "none",
});

const lastWord = (str: string) => {
  if (!str) {
    return "";
  }

  const words = str.split(" ");
  return words.length === 0 ? "" : words[words.length - 1];
};

const prettyCompetence = (str: string) => (str || "").replace(" (Primary)", "");

const renderRow = (config: Config, needle: string, firstNameOnly: boolean) => (
  contact: Contact,
) =>
  tr({ style: contactMatchesStyle(contact, needle) }, [
    td(
      ".img-column",
      a(
        { props: { href: config.FUM_BASEURL + "/fum/users/" + contact.login } },
        dataImg(config, contact.thumb),
      ),
    ),
    td(
      a(
        { props: { href: config.FUM_BASEURL + "/fum/users/" + contact.login } },
        contact[firstNameOnly ? "first" : "name"],
      ),
    ),
    td(separatedBy(contact.phones.map(renderPhone), " ")),
    td(contact.team || ""),
    td(contact.office || ""),
    td(".img-column", flowdockAvatar(config, contact.flowdock)),
    td(flowdock(contact.flowdock)),
    td(".img-column", githubAvatar(config, contact.github)),
    td(github(contact.github)),
    td(a({ props: { href: "mailto:" + contact.email } }, "email")),
    td(firstNameOnly ? lastWord(contact.title) : contact.title),
    td(prettyCompetence(contact.competence)),
  ]);

const footer = div("#footer", [
  a({ props: { name: "dagger" } }),
  sup("†"),
  " Entries in ",
  span(".unsure", "red"),
  " are unsure. The information is not from FUM or seems to be wrong.",
  br(),
  sup("‡"),
  " Data is updated about once an hour.",
]);

interface String2Number {
  [key: string]: number;
}

interface Stats {
  names: String2Number;
  titles: String2Number;
}
function calculateStats(contacts: Contact[]): Stats {
  const names: String2Number = {};
  const titles: String2Number = {};
  contacts.forEach(contact => {
    const name = contact.first;
    const title = lastWord(contact.title).toLowerCase();

    names[name] = (names[name] || 0) + 1;
    titles[title] = (titles[title] || 0) + 1;
  });

  return {
    names,
    titles,
  };
}

const renderStatsTable = (stats: String2Number) => {
  const pairs = _.chain(stats)
    .map((v: number, k: string) => [k, v])
    .filter(([k, v]) => v > 1 && k !== "")
    .sortBy(x => -x[1]) // ([_k, v]) => -v
    .value();

  return table(
    ".statstable",
    pairs.map(([k, v]) => tr([td(k), td(v.toString())])),
  );
};

const renderStatsTables = (stats: Stats) =>
  div([renderStatsTable(stats.names), renderStatsTable(stats.titles)]);

const renderTable = (
  config: Config,
  contacts: Contact[],
  needle: string,
  firstNameOnly: boolean,
) =>
  table(".hover", [
    thead(tableHeader),
    tbody(contacts.map(renderRow(config, needle, firstNameOnly))),
  ]);

// let's not name tribes "external' ;)
const countExternals = (contacts: Contact[]) =>
  _.chain(contacts).filter(c => c.external).value().length;

const renderCounts = (contacts: Contact[]) => {
  const total = contacts.length;
  const exts = countExternals(contacts);
  return div(
    "There are " + (total - exts) + " futuriceans and " + exts + " externals.",
  );
};

const renderSpinner = div(".loader", "Loading...");

function renderContacts(
  config: Config,
  contacts: Contact[],
  needle: string,
  firstNameOnly: boolean,
) {
  return div([
    wholerow(issueReports),
    row(cell(6, filterBar)),
    row(cell(12, renderCounts(contacts))),
    wholerow(
      contacts.length === 0
        ? renderSpinner
        : renderTable(config, contacts, needle, firstNameOnly),
    ),
    firstNameOnly
      ? wholerow(renderStatsTables(calculateStats(contacts)))
      : null,
    wholerow(footer),
  ]);
}

const mosaicImage = (config: Config, contact: Contact) =>
  a({ href: config.FUM_BASEURL + "/fum/users/" + contact.login }, [
    img({
      props: {
        height: 50,
        src:
          config.AVATAR_BASEURL + "/avatar?size=50&grey&url=" + contact.thumb,
        title: contact.name,
        width: 50,
      },
    }),
  ]);

const iddqdRender = (config: Config, contacts: Contact[]) =>
  div(
    "#mosaic",
    contacts
      .filter((contact: Contact) => !contact.thumb.match(/default_portrait/))
      .map(x => mosaicImage(config, x)),
  );

function render(
  config: Config,
  contacts: Contact[],
  needle: string,
  iddqd: boolean,
  firstNameOnly: boolean,
) {
  return iddqd
    ? iddqdRender(config, contacts)
    : renderContacts(config, contacts, needle, firstNameOnly);
}

function codeSource(
  keyPresses: Stream<KeyboardEvent>,
  code: string,
): Stream<boolean> {
  let index = 0;
  return keyPresses
    .map(ev => String.fromCharCode(ev.which))
    .map(c => {
      if (c === code[index++]) {
        return index === code.length;
      } else {
        index = 0;
        return false;
      }
    })
    .filter(Boolean)
    .map(() => true)
    .startWith(false);
}

interface Sources {
  HTTP: HTTPSource;
  DOM: DOMSource;
  keyPresses: Stream<KeyboardEvent>;
}

function main(responses: Sources) {
  const request$ = xs.of(
    { category: "config", url: CONFIG_URL },
    { category: "contacts", url: CONTACTS_URL },
  );

  const config$: Stream<Config> = responses.HTTP
    .select("config")
    .flatten()
    .map(res => {
      // console.info("Got config", res.body);
      return res.body;
    });

  const filter$ = responses.DOM
    .select(".filter")
    .events("input")
    .map(ev => (ev.target as HTMLInputElement).value)
    .startWith("")
    .map(needle => (needle.trim().length < 3 ? "" : needle.trim()))
    .compose(dropRepeats());

  const iddqd$ = codeSource(responses.keyPresses, "iddqd");
  const idclip$ = codeSource(responses.keyPresses, "idclip");

  const contacts$: Stream<Contact[]> = responses.HTTP
    .select("contacts")
    .flatten()
    .map(res => {
      // console.info("Got contacts");
      return res.body;
    })
    .startWith([]);

  const vtree$ = xs
    .combine(config$, contacts$, filter$, iddqd$, idclip$)
    .map(args => render.apply(null, args));

  return {
    DOM: vtree$,
    HTTP: request$,
  };
}

run(main, {
  DOM: makeDOMDriver("#main-container"),
  HTTP: makeHTTPDriver(),
  keyPresses: () => fromEvent(document, "keypress"),
});
