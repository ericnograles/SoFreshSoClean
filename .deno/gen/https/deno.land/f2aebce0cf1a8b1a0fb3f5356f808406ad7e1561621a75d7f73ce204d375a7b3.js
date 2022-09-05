// Note: this is the semver.org version of the spec that it implements
// Not necessarily the package version of this code.
export const SEMVER_SPEC_VERSION = "2.0.0";
const MAX_LENGTH = 256;
// The actual regexps
const re = [];
const src = [];
let R = 0;
// The following Regular Expressions can be used for tokenizing,
// validating, and parsing SemVer version strings.
// ## Numeric Identifier
// A single `0`, or a non-zero digit followed by zero or more digits.
const NUMERICIDENTIFIER = R++;
src[NUMERICIDENTIFIER] = "0|[1-9]\\d*";
// ## Non-numeric Identifier
// Zero or more digits, followed by a letter or hyphen, and then zero or
// more letters, digits, or hyphens.
const NONNUMERICIDENTIFIER = R++;
src[NONNUMERICIDENTIFIER] = "\\d*[a-zA-Z-][a-zA-Z0-9-]*";
// ## Main Version
// Three dot-separated numeric identifiers.
const MAINVERSION = R++;
const nid = src[NUMERICIDENTIFIER];
src[MAINVERSION] = `(${nid})\\.(${nid})\\.(${nid})`;
// ## Pre-release Version Identifier
// A numeric identifier, or a non-numeric identifier.
const PRERELEASEIDENTIFIER = R++;
src[PRERELEASEIDENTIFIER] = "(?:" + src[NUMERICIDENTIFIER] + "|" + src[NONNUMERICIDENTIFIER] + ")";
// ## Pre-release Version
// Hyphen, followed by one or more dot-separated pre-release version
// identifiers.
const PRERELEASE = R++;
src[PRERELEASE] = "(?:-(" + src[PRERELEASEIDENTIFIER] + "(?:\\." + src[PRERELEASEIDENTIFIER] + ")*))";
// ## Build Metadata Identifier
// Any combination of digits, letters, or hyphens.
const BUILDIDENTIFIER = R++;
src[BUILDIDENTIFIER] = "[0-9A-Za-z-]+";
// ## Build Metadata
// Plus sign, followed by one or more period-separated build metadata
// identifiers.
const BUILD = R++;
src[BUILD] = "(?:\\+(" + src[BUILDIDENTIFIER] + "(?:\\." + src[BUILDIDENTIFIER] + ")*))";
// ## Full Version String
// A main version, followed optionally by a pre-release version and
// build metadata.
// Note that the only major, minor, patch, and pre-release sections of
// the version string are capturing groups.  The build metadata is not a
// capturing group, because it should not ever be used in version
// comparison.
const FULL = R++;
const FULLPLAIN = "v?" + src[MAINVERSION] + src[PRERELEASE] + "?" + src[BUILD] + "?";
src[FULL] = "^" + FULLPLAIN + "$";
const GTLT = R++;
src[GTLT] = "((?:<|>)?=?)";
// Something like "2.*" or "1.2.x".
// Note that "x.x" is a valid xRange identifer, meaning "any version"
// Only the first item is strictly required.
const XRANGEIDENTIFIER = R++;
src[XRANGEIDENTIFIER] = src[NUMERICIDENTIFIER] + "|x|X|\\*";
const XRANGEPLAIN = R++;
src[XRANGEPLAIN] = "[v=\\s]*(" + src[XRANGEIDENTIFIER] + ")" + "(?:\\.(" + src[XRANGEIDENTIFIER] + ")" + "(?:\\.(" + src[XRANGEIDENTIFIER] + ")" + "(?:" + src[PRERELEASE] + ")?" + src[BUILD] + "?" + ")?)?";
const XRANGE = R++;
src[XRANGE] = "^" + src[GTLT] + "\\s*" + src[XRANGEPLAIN] + "$";
// Tilde ranges.
// Meaning is "reasonably at or greater than"
const LONETILDE = R++;
src[LONETILDE] = "(?:~>?)";
const TILDE = R++;
src[TILDE] = "^" + src[LONETILDE] + src[XRANGEPLAIN] + "$";
// Caret ranges.
// Meaning is "at least and backwards compatible with"
const LONECARET = R++;
src[LONECARET] = "(?:\\^)";
const CARET = R++;
src[CARET] = "^" + src[LONECARET] + src[XRANGEPLAIN] + "$";
// A simple gt/lt/eq thing, or just "" to indicate "any version"
const COMPARATOR = R++;
src[COMPARATOR] = "^" + src[GTLT] + "\\s*(" + FULLPLAIN + ")$|^$";
// Something like `1.2.3 - 1.2.4`
const HYPHENRANGE = R++;
src[HYPHENRANGE] = "^\\s*(" + src[XRANGEPLAIN] + ")" + "\\s+-\\s+" + "(" + src[XRANGEPLAIN] + ")" + "\\s*$";
// Star ranges basically just allow anything at all.
const STAR = R++;
src[STAR] = "(<|>)?=?\\s*\\*";
// Compile to actual regexp objects.
// All are flag-free, unless they were created above with a flag.
for(let i = 0; i < R; i++){
    if (!re[i]) {
        re[i] = new RegExp(src[i]);
    }
}
export function parse(version, options) {
    if (typeof options !== "object") {
        options = {
            includePrerelease: false
        };
    }
    if (version instanceof SemVer) {
        return version;
    }
    if (typeof version !== "string") {
        return null;
    }
    if (version.length > MAX_LENGTH) {
        return null;
    }
    const r = re[FULL];
    if (!r.test(version)) {
        return null;
    }
    try {
        return new SemVer(version, options);
    } catch  {
        return null;
    }
}
export function valid(version, options) {
    if (version === null) return null;
    const v = parse(version, options);
    return v ? v.version : null;
}
export class SemVer {
    raw;
    options;
    major;
    minor;
    patch;
    version;
    build;
    prerelease;
    constructor(version, options){
        if (typeof options !== "object") {
            options = {
                includePrerelease: false
            };
        }
        if (version instanceof SemVer) {
            version = version.version;
        } else if (typeof version !== "string") {
            throw new TypeError("Invalid Version: " + version);
        }
        if (version.length > MAX_LENGTH) {
            throw new TypeError("version is longer than " + MAX_LENGTH + " characters");
        }
        if (!(this instanceof SemVer)) {
            return new SemVer(version, options);
        }
        this.options = options;
        const m = version.trim().match(re[FULL]);
        if (!m) {
            throw new TypeError("Invalid Version: " + version);
        }
        this.raw = version;
        // these are actually numbers
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];
        if (this.major > Number.MAX_SAFE_INTEGER || this.major < 0) {
            throw new TypeError("Invalid major version");
        }
        if (this.minor > Number.MAX_SAFE_INTEGER || this.minor < 0) {
            throw new TypeError("Invalid minor version");
        }
        if (this.patch > Number.MAX_SAFE_INTEGER || this.patch < 0) {
            throw new TypeError("Invalid patch version");
        }
        // numberify any prerelease numeric ids
        if (!m[4]) {
            this.prerelease = [];
        } else {
            this.prerelease = m[4].split(".").map((id)=>{
                if (/^[0-9]+$/.test(id)) {
                    const num = +id;
                    if (num >= 0 && num < Number.MAX_SAFE_INTEGER) {
                        return num;
                    }
                }
                return id;
            });
        }
        this.build = m[5] ? m[5].split(".") : [];
        this.format();
    }
    format() {
        this.version = this.major + "." + this.minor + "." + this.patch;
        if (this.prerelease.length) {
            this.version += "-" + this.prerelease.join(".");
        }
        return this.version;
    }
    compare(other) {
        if (!(other instanceof SemVer)) {
            other = new SemVer(other, this.options);
        }
        return this.compareMain(other) || this.comparePre(other);
    }
    compareMain(other) {
        if (!(other instanceof SemVer)) {
            other = new SemVer(other, this.options);
        }
        return compareIdentifiers(this.major, other.major) || compareIdentifiers(this.minor, other.minor) || compareIdentifiers(this.patch, other.patch);
    }
    comparePre(other) {
        if (!(other instanceof SemVer)) {
            other = new SemVer(other, this.options);
        }
        // NOT having a prerelease is > having one
        if (this.prerelease.length && !other.prerelease.length) {
            return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
            return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
            return 0;
        }
        let i1 = 0;
        do {
            const a = this.prerelease[i1];
            const b = other.prerelease[i1];
            if (a === undefined && b === undefined) {
                return 0;
            } else if (b === undefined) {
                return 1;
            } else if (a === undefined) {
                return -1;
            } else if (a === b) {
                continue;
            } else {
                return compareIdentifiers(a, b);
            }
        }while (++i1)
        return 1;
    }
    compareBuild(other) {
        if (!(other instanceof SemVer)) {
            other = new SemVer(other, this.options);
        }
        let i2 = 0;
        do {
            const a = this.build[i2];
            const b = other.build[i2];
            if (a === undefined && b === undefined) {
                return 0;
            } else if (b === undefined) {
                return 1;
            } else if (a === undefined) {
                return -1;
            } else if (a === b) {
                continue;
            } else {
                return compareIdentifiers(a, b);
            }
        }while (++i2)
        return 1;
    }
    inc(release, identifier) {
        switch(release){
            case "premajor":
                this.prerelease.length = 0;
                this.patch = 0;
                this.minor = 0;
                this.major++;
                this.inc("pre", identifier);
                break;
            case "preminor":
                this.prerelease.length = 0;
                this.patch = 0;
                this.minor++;
                this.inc("pre", identifier);
                break;
            case "prepatch":
                // If this is already a prerelease, it will bump to the next version
                // drop any prereleases that might already exist, since they are not
                // relevant at this point.
                this.prerelease.length = 0;
                this.inc("patch", identifier);
                this.inc("pre", identifier);
                break;
            // If the input is a non-prerelease version, this acts the same as
            // prepatch.
            case "prerelease":
                if (this.prerelease.length === 0) {
                    this.inc("patch", identifier);
                }
                this.inc("pre", identifier);
                break;
            case "major":
                // If this is a pre-major version, bump up to the same major version.
                // Otherwise increment major.
                // 1.0.0-5 bumps to 1.0.0
                // 1.1.0 bumps to 2.0.0
                if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
                    this.major++;
                }
                this.minor = 0;
                this.patch = 0;
                this.prerelease = [];
                break;
            case "minor":
                // If this is a pre-minor version, bump up to the same minor version.
                // Otherwise increment minor.
                // 1.2.0-5 bumps to 1.2.0
                // 1.2.1 bumps to 1.3.0
                if (this.patch !== 0 || this.prerelease.length === 0) {
                    this.minor++;
                }
                this.patch = 0;
                this.prerelease = [];
                break;
            case "patch":
                // If this is not a pre-release version, it will increment the patch.
                // If it is a pre-release it will bump up to the same patch version.
                // 1.2.0-5 patches to 1.2.0
                // 1.2.0 patches to 1.2.1
                if (this.prerelease.length === 0) {
                    this.patch++;
                }
                this.prerelease = [];
                break;
            // This probably shouldn't be used publicly.
            // 1.0.0 "pre" would become 1.0.0-0 which is the wrong direction.
            case "pre":
                if (this.prerelease.length === 0) {
                    this.prerelease = [
                        0
                    ];
                } else {
                    let i3 = this.prerelease.length;
                    while(--i3 >= 0){
                        if (typeof this.prerelease[i3] === "number") {
                            // deno-fmt-ignore
                            (this.prerelease[i3])++;
                            i3 = -2;
                        }
                    }
                    if (i3 === -1) {
                        // didn't increment anything
                        this.prerelease.push(0);
                    }
                }
                if (identifier) {
                    // 1.2.0-beta.1 bumps to 1.2.0-beta.2,
                    // 1.2.0-beta.fooblz or 1.2.0-beta bumps to 1.2.0-beta.0
                    if (this.prerelease[0] === identifier) {
                        if (isNaN(this.prerelease[1])) {
                            this.prerelease = [
                                identifier,
                                0
                            ];
                        }
                    } else {
                        this.prerelease = [
                            identifier,
                            0
                        ];
                    }
                }
                break;
            default:
                throw new Error("invalid increment argument: " + release);
        }
        this.format();
        this.raw = this.version;
        return this;
    }
    toString() {
        return this.version;
    }
}
/**
 * Return the version incremented by the release type (major, minor, patch, or prerelease), or null if it's not valid.
 */ export function inc(version, release, options, identifier) {
    if (typeof options === "string") {
        identifier = options;
        options = undefined;
    }
    try {
        return new SemVer(version, options).inc(release, identifier).version;
    } catch  {
        return null;
    }
}
export function diff(version1, version2, options) {
    if (eq(version1, version2, options)) {
        return null;
    } else {
        const v1 = parse(version1);
        const v2 = parse(version2);
        let prefix = "";
        let defaultResult = null;
        if (v1 && v2) {
            if (v1.prerelease.length || v2.prerelease.length) {
                prefix = "pre";
                defaultResult = "prerelease";
            }
            for(const key in v1){
                if (key === "major" || key === "minor" || key === "patch") {
                    if (v1[key] !== v2[key]) {
                        return prefix + key;
                    }
                }
            }
        }
        return defaultResult; // may be undefined
    }
}
const numeric = /^[0-9]+$/;
export function compareIdentifiers(a, b) {
    const anum = numeric.test(a);
    const bnum = numeric.test(b);
    if (a === null || b === null) throw "Comparison against null invalid";
    if (anum && bnum) {
        a = +a;
        b = +b;
    }
    return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
}
export function rcompareIdentifiers(a, b) {
    return compareIdentifiers(b, a);
}
/**
 * Return the major version number.
 */ export function major(v, options) {
    return new SemVer(v, options).major;
}
/**
 * Return the minor version number.
 */ export function minor(v, options) {
    return new SemVer(v, options).minor;
}
/**
 * Return the patch version number.
 */ export function patch(v, options) {
    return new SemVer(v, options).patch;
}
export function compare(v1, v2, options) {
    return new SemVer(v1, options).compare(new SemVer(v2, options));
}
export function compareBuild(a, b, options) {
    const versionA = new SemVer(a, options);
    const versionB = new SemVer(b, options);
    return versionA.compare(versionB) || versionA.compareBuild(versionB);
}
export function rcompare(v1, v2, options) {
    return compare(v2, v1, options);
}
export function sort(list, options) {
    return list.sort((a, b)=>{
        return compareBuild(a, b, options);
    });
}
export function rsort(list, options) {
    return list.sort((a, b)=>{
        return compareBuild(b, a, options);
    });
}
export function gt(v1, v2, options) {
    return compare(v1, v2, options) > 0;
}
export function lt(v1, v2, options) {
    return compare(v1, v2, options) < 0;
}
export function eq(v1, v2, options) {
    return compare(v1, v2, options) === 0;
}
export function neq(v1, v2, options) {
    return compare(v1, v2, options) !== 0;
}
export function gte(v1, v2, options) {
    return compare(v1, v2, options) >= 0;
}
export function lte(v1, v2, options) {
    return compare(v1, v2, options) <= 0;
}
export function cmp(v1, operator, v2, options) {
    switch(operator){
        case "===":
            if (typeof v1 === "object") v1 = v1.version;
            if (typeof v2 === "object") v2 = v2.version;
            return v1 === v2;
        case "!==":
            if (typeof v1 === "object") v1 = v1.version;
            if (typeof v2 === "object") v2 = v2.version;
            return v1 !== v2;
        case "":
        case "=":
        case "==":
            return eq(v1, v2, options);
        case "!=":
            return neq(v1, v2, options);
        case ">":
            return gt(v1, v2, options);
        case ">=":
            return gte(v1, v2, options);
        case "<":
            return lt(v1, v2, options);
        case "<=":
            return lte(v1, v2, options);
        default:
            throw new TypeError("Invalid operator: " + operator);
    }
}
const ANY = {};
export class Comparator {
    semver;
    operator;
    value;
    options;
    constructor(comp, options){
        if (typeof options !== "object") {
            options = {
                includePrerelease: false
            };
        }
        if (comp instanceof Comparator) {
            return comp;
        }
        if (!(this instanceof Comparator)) {
            return new Comparator(comp, options);
        }
        this.options = options;
        this.parse(comp);
        if (this.semver === ANY) {
            this.value = "";
        } else {
            this.value = this.operator + this.semver.version;
        }
    }
    parse(comp) {
        const r = re[COMPARATOR];
        const m = comp.match(r);
        if (!m) {
            throw new TypeError("Invalid comparator: " + comp);
        }
        const m1 = m[1];
        this.operator = m1 !== undefined ? m1 : "";
        if (this.operator === "=") {
            this.operator = "";
        }
        // if it literally is just '>' or '' then allow anything.
        if (!m[2]) {
            this.semver = ANY;
        } else {
            this.semver = new SemVer(m[2], this.options);
        }
    }
    test(version) {
        if (this.semver === ANY || version === ANY) {
            return true;
        }
        if (typeof version === "string") {
            version = new SemVer(version, this.options);
        }
        return cmp(version, this.operator, this.semver, this.options);
    }
    intersects(comp, options) {
        if (!(comp instanceof Comparator)) {
            throw new TypeError("a Comparator is required");
        }
        if (typeof options !== "object") {
            options = {
                includePrerelease: false
            };
        }
        let rangeTmp;
        if (this.operator === "") {
            if (this.value === "") {
                return true;
            }
            rangeTmp = new Range(comp.value, options);
            return satisfies(this.value, rangeTmp, options);
        } else if (comp.operator === "") {
            if (comp.value === "") {
                return true;
            }
            rangeTmp = new Range(this.value, options);
            return satisfies(comp.semver, rangeTmp, options);
        }
        const sameDirectionIncreasing = (this.operator === ">=" || this.operator === ">") && (comp.operator === ">=" || comp.operator === ">");
        const sameDirectionDecreasing = (this.operator === "<=" || this.operator === "<") && (comp.operator === "<=" || comp.operator === "<");
        const sameSemVer = this.semver.version === comp.semver.version;
        const differentDirectionsInclusive = (this.operator === ">=" || this.operator === "<=") && (comp.operator === ">=" || comp.operator === "<=");
        const oppositeDirectionsLessThan = cmp(this.semver, "<", comp.semver, options) && (this.operator === ">=" || this.operator === ">") && (comp.operator === "<=" || comp.operator === "<");
        const oppositeDirectionsGreaterThan = cmp(this.semver, ">", comp.semver, options) && (this.operator === "<=" || this.operator === "<") && (comp.operator === ">=" || comp.operator === ">");
        return sameDirectionIncreasing || sameDirectionDecreasing || sameSemVer && differentDirectionsInclusive || oppositeDirectionsLessThan || oppositeDirectionsGreaterThan;
    }
    toString() {
        return this.value;
    }
}
export class Range {
    range;
    raw;
    options;
    includePrerelease;
    set;
    constructor(range1, options){
        if (typeof options !== "object") {
            options = {
                includePrerelease: false
            };
        }
        if (range1 instanceof Range) {
            if (range1.includePrerelease === !!options.includePrerelease) {
                return range1;
            } else {
                return new Range(range1.raw, options);
            }
        }
        if (range1 instanceof Comparator) {
            return new Range(range1.value, options);
        }
        if (!(this instanceof Range)) {
            return new Range(range1, options);
        }
        this.options = options;
        this.includePrerelease = !!options.includePrerelease;
        // First, split based on boolean or ||
        this.raw = range1;
        this.set = range1.split(/\s*\|\|\s*/).map((range)=>this.parseRange(range.trim())).filter((c)=>{
            // throw out any that are not relevant for whatever reason
            return c.length;
        });
        if (!this.set.length) {
            throw new TypeError("Invalid SemVer Range: " + range1);
        }
        this.format();
    }
    format() {
        this.range = this.set.map((comps)=>comps.join(" ").trim()).join("||").trim();
        return this.range;
    }
    parseRange(range) {
        range = range.trim();
        // `1.2.3 - 1.2.4` => `>=1.2.3 <=1.2.4`
        const hr = re[HYPHENRANGE];
        range = range.replace(hr, hyphenReplace);
        // normalize spaces
        range = range.split(/\s+/).join(" ");
        // At this point, the range is completely trimmed and
        // ready to be split into comparators.
        const set = range.split(" ").map((comp)=>parseComparator(comp, this.options)).join(" ").split(/\s+/);
        return set.map((comp)=>new Comparator(comp, this.options));
    }
    test(version) {
        if (typeof version === "string") {
            version = new SemVer(version, this.options);
        }
        for(let i4 = 0; i4 < this.set.length; i4++){
            if (testSet(this.set[i4], version, this.options)) {
                return true;
            }
        }
        return false;
    }
    intersects(range, options) {
        if (!(range instanceof Range)) {
            throw new TypeError("a Range is required");
        }
        return this.set.some((thisComparators)=>{
            return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators)=>{
                return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator)=>{
                    return rangeComparators.every((rangeComparator)=>{
                        return thisComparator.intersects(rangeComparator, options);
                    });
                });
            });
        });
    }
    toString() {
        return this.range;
    }
}
function testSet(set, version, options) {
    for(let i5 = 0; i5 < set.length; i5++){
        if (!set[i5].test(version)) {
            return false;
        }
    }
    if (version.prerelease.length && !options.includePrerelease) {
        // Find the set of versions that are allowed to have prereleases
        // For example, ^1.2.3-pr.1 desugars to >=1.2.3-pr.1 <2.0.0
        // That should allow `1.2.3-pr.2` to pass.
        // However, `1.2.4-alpha.notready` should NOT be allowed,
        // even though it's within the range set by the comparators.
        for(let i6 = 0; i6 < set.length; i6++){
            if (set[i6].semver === ANY) {
                continue;
            }
            if (set[i6].semver.prerelease.length > 0) {
                const allowed = set[i6].semver;
                if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
                    return true;
                }
            }
        }
        // Version has a -pre, but it's not one of the ones we like.
        return false;
    }
    return true;
}
// take a set of comparators and determine whether there
// exists a version which can satisfy it
function isSatisfiable(comparators, options) {
    let result = true;
    const remainingComparators = comparators.slice();
    let testComparator = remainingComparators.pop();
    while(result && remainingComparators.length){
        result = remainingComparators.every((otherComparator)=>{
            return testComparator?.intersects(otherComparator, options);
        });
        testComparator = remainingComparators.pop();
    }
    return result;
}
// Mostly just for testing and legacy API reasons
export function toComparators(range, options) {
    return new Range(range, options).set.map((comp)=>{
        return comp.map((c)=>c.value).join(" ").trim().split(" ");
    });
}
// comprised of xranges, tildes, stars, and gtlt's at this point.
// already replaced the hyphen ranges
// turn into a set of JUST comparators.
function parseComparator(comp, options) {
    comp = replaceCarets(comp, options);
    comp = replaceTildes(comp, options);
    comp = replaceXRanges(comp, options);
    comp = replaceStars(comp, options);
    return comp;
}
function isX(id) {
    return !id || id.toLowerCase() === "x" || id === "*";
}
// ~, ~> --> * (any, kinda silly)
// ~2, ~2.x, ~2.x.x, ~>2, ~>2.x ~>2.x.x --> >=2.0.0 <3.0.0
// ~2.0, ~2.0.x, ~>2.0, ~>2.0.x --> >=2.0.0 <2.1.0
// ~1.2, ~1.2.x, ~>1.2, ~>1.2.x --> >=1.2.0 <1.3.0
// ~1.2.3, ~>1.2.3 --> >=1.2.3 <1.3.0
// ~1.2.0, ~>1.2.0 --> >=1.2.0 <1.3.0
function replaceTildes(comp1, options) {
    return comp1.trim().split(/\s+/).map((comp)=>replaceTilde(comp, options)).join(" ");
}
function replaceTilde(comp, _options) {
    const r = re[TILDE];
    return comp.replace(r, (_, M, m, p, pr)=>{
        let ret;
        if (isX(M)) {
            ret = "";
        } else if (isX(m)) {
            ret = ">=" + M + ".0.0 <" + (+M + 1) + ".0.0";
        } else if (isX(p)) {
            // ~1.2 == >=1.2.0 <1.3.0
            ret = ">=" + M + "." + m + ".0 <" + M + "." + (+m + 1) + ".0";
        } else if (pr) {
            ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + M + "." + (+m + 1) + ".0";
        } else {
            // ~1.2.3 == >=1.2.3 <1.3.0
            ret = ">=" + M + "." + m + "." + p + " <" + M + "." + (+m + 1) + ".0";
        }
        return ret;
    });
}
// ^ --> * (any, kinda silly)
// ^2, ^2.x, ^2.x.x --> >=2.0.0 <3.0.0
// ^2.0, ^2.0.x --> >=2.0.0 <3.0.0
// ^1.2, ^1.2.x --> >=1.2.0 <2.0.0
// ^1.2.3 --> >=1.2.3 <2.0.0
// ^1.2.0 --> >=1.2.0 <2.0.0
function replaceCarets(comp2, options) {
    return comp2.trim().split(/\s+/).map((comp)=>replaceCaret(comp, options)).join(" ");
}
function replaceCaret(comp, _options) {
    const r = re[CARET];
    return comp.replace(r, (_, M, m, p, pr)=>{
        let ret;
        if (isX(M)) {
            ret = "";
        } else if (isX(m)) {
            ret = ">=" + M + ".0.0 <" + (+M + 1) + ".0.0";
        } else if (isX(p)) {
            if (M === "0") {
                ret = ">=" + M + "." + m + ".0 <" + M + "." + (+m + 1) + ".0";
            } else {
                ret = ">=" + M + "." + m + ".0 <" + (+M + 1) + ".0.0";
            }
        } else if (pr) {
            if (M === "0") {
                if (m === "0") {
                    ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + M + "." + m + "." + (+p + 1);
                } else {
                    ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + M + "." + (+m + 1) + ".0";
                }
            } else {
                ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + (+M + 1) + ".0.0";
            }
        } else {
            if (M === "0") {
                if (m === "0") {
                    ret = ">=" + M + "." + m + "." + p + " <" + M + "." + m + "." + (+p + 1);
                } else {
                    ret = ">=" + M + "." + m + "." + p + " <" + M + "." + (+m + 1) + ".0";
                }
            } else {
                ret = ">=" + M + "." + m + "." + p + " <" + (+M + 1) + ".0.0";
            }
        }
        return ret;
    });
}
function replaceXRanges(comp3, options) {
    return comp3.split(/\s+/).map((comp)=>replaceXRange(comp, options)).join(" ");
}
function replaceXRange(comp, _options) {
    comp = comp.trim();
    const r = re[XRANGE];
    return comp.replace(r, (ret, gtlt, M, m, p, _pr)=>{
        const xM = isX(M);
        const xm = xM || isX(m);
        const xp = xm || isX(p);
        const anyX = xp;
        if (gtlt === "=" && anyX) {
            gtlt = "";
        }
        if (xM) {
            if (gtlt === ">" || gtlt === "<") {
                // nothing is allowed
                ret = "<0.0.0";
            } else {
                // nothing is forbidden
                ret = "*";
            }
        } else if (gtlt && anyX) {
            // we know patch is an x, because we have any x at all.
            // replace X with 0
            if (xm) {
                m = 0;
            }
            p = 0;
            if (gtlt === ">") {
                // >1 => >=2.0.0
                // >1.2 => >=1.3.0
                // >1.2.3 => >= 1.2.4
                gtlt = ">=";
                if (xm) {
                    M = +M + 1;
                    m = 0;
                    p = 0;
                } else {
                    m = +m + 1;
                    p = 0;
                }
            } else if (gtlt === "<=") {
                // <=0.7.x is actually <0.8.0, since any 0.7.x should
                // pass.  Similarly, <=7.x is actually <8.0.0, etc.
                gtlt = "<";
                if (xm) {
                    M = +M + 1;
                } else {
                    m = +m + 1;
                }
            }
            ret = gtlt + M + "." + m + "." + p;
        } else if (xm) {
            ret = ">=" + M + ".0.0 <" + (+M + 1) + ".0.0";
        } else if (xp) {
            ret = ">=" + M + "." + m + ".0 <" + M + "." + (+m + 1) + ".0";
        }
        return ret;
    });
}
// Because * is AND-ed with everything else in the comparator,
// and '' means "any version", just remove the *s entirely.
function replaceStars(comp, _options) {
    return comp.trim().replace(re[STAR], "");
}
// This function is passed to string.replace(re[HYPHENRANGE])
// M, m, patch, prerelease, build
// 1.2 - 3.4.5 => >=1.2.0 <=3.4.5
// 1.2.3 - 3.4 => >=1.2.0 <3.5.0 Any 3.4.x will do
// 1.2 - 3.4 => >=1.2.0 <3.5.0
function hyphenReplace(_$0, from, fM, fm, fp, _fpr, _fb, to, tM, tm, tp, tpr, _tb) {
    if (isX(fM)) {
        from = "";
    } else if (isX(fm)) {
        from = ">=" + fM + ".0.0";
    } else if (isX(fp)) {
        from = ">=" + fM + "." + fm + ".0";
    } else {
        from = ">=" + from;
    }
    if (isX(tM)) {
        to = "";
    } else if (isX(tm)) {
        to = "<" + (+tM + 1) + ".0.0";
    } else if (isX(tp)) {
        to = "<" + tM + "." + (+tm + 1) + ".0";
    } else if (tpr) {
        to = "<=" + tM + "." + tm + "." + tp + "-" + tpr;
    } else {
        to = "<=" + to;
    }
    return (from + " " + to).trim();
}
export function satisfies(version, range, options) {
    try {
        range = new Range(range, options);
    } catch  {
        return false;
    }
    return range.test(version);
}
export function maxSatisfying(versions, range, options) {
    //todo
    let max = null;
    let maxSV = null;
    let rangeObj;
    try {
        rangeObj = new Range(range, options);
    } catch  {
        return null;
    }
    versions.forEach((v)=>{
        if (rangeObj.test(v)) {
            // satisfies(v, range, options)
            if (!max || maxSV && maxSV.compare(v) === -1) {
                // compare(max, v, true)
                max = v;
                maxSV = new SemVer(max, options);
            }
        }
    });
    return max;
}
export function minSatisfying(versions, range, options) {
    //todo
    let min = null;
    let minSV = null;
    let rangeObj;
    try {
        rangeObj = new Range(range, options);
    } catch  {
        return null;
    }
    versions.forEach((v)=>{
        if (rangeObj.test(v)) {
            // satisfies(v, range, options)
            if (!min || minSV.compare(v) === 1) {
                // compare(min, v, true)
                min = v;
                minSV = new SemVer(min, options);
            }
        }
    });
    return min;
}
export function minVersion(range, options) {
    range = new Range(range, options);
    let minver = new SemVer("0.0.0");
    if (range.test(minver)) {
        return minver;
    }
    minver = new SemVer("0.0.0-0");
    if (range.test(minver)) {
        return minver;
    }
    minver = null;
    for(let i7 = 0; i7 < range.set.length; ++i7){
        const comparators = range.set[i7];
        comparators.forEach((comparator)=>{
            // Clone to avoid manipulating the comparator's semver object.
            const compver = new SemVer(comparator.semver.version);
            switch(comparator.operator){
                case ">":
                    if (compver.prerelease.length === 0) {
                        compver.patch++;
                    } else {
                        compver.prerelease.push(0);
                    }
                    compver.raw = compver.format();
                /* fallthrough */ case "":
                case ">=":
                    if (!minver || gt(minver, compver)) {
                        minver = compver;
                    }
                    break;
                case "<":
                case "<=":
                    break;
                /* istanbul ignore next */ default:
                    throw new Error("Unexpected operation: " + comparator.operator);
            }
        });
    }
    if (minver && range.test(minver)) {
        return minver;
    }
    return null;
}
export function validRange(range, options) {
    try {
        if (range === null) return null;
        // Return '*' instead of '' so that truthiness works.
        // This will throw if it's invalid anyway
        return new Range(range, options).range || "*";
    } catch  {
        return null;
    }
}
/**
 * Return true if version is less than all the versions possible in the range.
 */ export function ltr(version, range, options) {
    return outside(version, range, "<", options);
}
/**
 * Return true if version is greater than all the versions possible in the range.
 */ export function gtr(version, range, options) {
    return outside(version, range, ">", options);
}
/**
 * Return true if the version is outside the bounds of the range in either the high or low direction.
 * The hilo argument must be either the string '>' or '<'. (This is the function called by gtr and ltr.)
 */ export function outside(version, range, hilo, options) {
    version = new SemVer(version, options);
    range = new Range(range, options);
    let gtfn;
    let ltefn;
    let ltfn;
    let comp;
    let ecomp;
    switch(hilo){
        case ">":
            gtfn = gt;
            ltefn = lte;
            ltfn = lt;
            comp = ">";
            ecomp = ">=";
            break;
        case "<":
            gtfn = lt;
            ltefn = gte;
            ltfn = gt;
            comp = "<";
            ecomp = "<=";
            break;
        default:
            throw new TypeError('Must provide a hilo val of "<" or ">"');
    }
    // If it satisifes the range it is not outside
    if (satisfies(version, range, options)) {
        return false;
    }
    // From now on, variable terms are as if we're in "gtr" mode.
    // but note that everything is flipped for the "ltr" function.
    for(let i8 = 0; i8 < range.set.length; ++i8){
        const comparators = range.set[i8];
        let high = null;
        let low = null;
        for (let comparator of comparators){
            if (comparator.semver === ANY) {
                comparator = new Comparator(">=0.0.0");
            }
            high = high || comparator;
            low = low || comparator;
            if (gtfn(comparator.semver, high.semver, options)) {
                high = comparator;
            } else if (ltfn(comparator.semver, low.semver, options)) {
                low = comparator;
            }
        }
        if (high === null || low === null) return true;
        // If the edge version comparator has a operator then our version
        // isn't outside it
        if (high.operator === comp || high.operator === ecomp) {
            return false;
        }
        // If the lowest version comparator has an operator and our version
        // is less than it then it isn't higher than the range
        if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
            return false;
        } else if (low.operator === ecomp && ltfn(version, low.semver)) {
            return false;
        }
    }
    return true;
}
export function prerelease(version, options) {
    const parsed = parse(version, options);
    return parsed && parsed.prerelease.length ? parsed.prerelease : null;
}
/**
 * Return true if any of the ranges comparators intersect
 */ export function intersects(range1, range2, options) {
    range1 = new Range(range1, options);
    range2 = new Range(range2, options);
    return range1.intersects(range2);
}
export default SemVer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE1MC4wL3NlbXZlci9tb2QudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IElzYWFjIFouIFNjaGx1ZXRlciBhbmQgQ29udHJpYnV0b3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBJU0MgbGljZW5zZS5cbi8vIENvcHlyaWdodCAyMDE4LTIwMjIgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5cbi8qKlxuICogVGhlIHNlbWFudGljIHZlcnNpb24gcGFyc2VyLlxuICpcbiAqIFRoaXMgbW9kdWxlIGlzIGJyb3dzZXIgY29tcGF0aWJsZS5cbiAqXG4gKiBAbW9kdWxlXG4gKi9cblxuZXhwb3J0IHR5cGUgUmVsZWFzZVR5cGUgPVxuICB8IFwicHJlXCJcbiAgfCBcIm1ham9yXCJcbiAgfCBcInByZW1ham9yXCJcbiAgfCBcIm1pbm9yXCJcbiAgfCBcInByZW1pbm9yXCJcbiAgfCBcInBhdGNoXCJcbiAgfCBcInByZXBhdGNoXCJcbiAgfCBcInByZXJlbGVhc2VcIjtcblxuZXhwb3J0IHR5cGUgT3BlcmF0b3IgPVxuICB8IFwiPT09XCJcbiAgfCBcIiE9PVwiXG4gIHwgXCJcIlxuICB8IFwiPVwiXG4gIHwgXCI9PVwiXG4gIHwgXCIhPVwiXG4gIHwgXCI+XCJcbiAgfCBcIj49XCJcbiAgfCBcIjxcIlxuICB8IFwiPD1cIjtcblxuZXhwb3J0IGludGVyZmFjZSBPcHRpb25zIHtcbiAgaW5jbHVkZVByZXJlbGVhc2U/OiBib29sZWFuO1xufVxuXG4vLyBOb3RlOiB0aGlzIGlzIHRoZSBzZW12ZXIub3JnIHZlcnNpb24gb2YgdGhlIHNwZWMgdGhhdCBpdCBpbXBsZW1lbnRzXG4vLyBOb3QgbmVjZXNzYXJpbHkgdGhlIHBhY2thZ2UgdmVyc2lvbiBvZiB0aGlzIGNvZGUuXG5leHBvcnQgY29uc3QgU0VNVkVSX1NQRUNfVkVSU0lPTiA9IFwiMi4wLjBcIjtcblxuY29uc3QgTUFYX0xFTkdUSCA9IDI1NjtcblxuLy8gVGhlIGFjdHVhbCByZWdleHBzXG5jb25zdCByZTogUmVnRXhwW10gPSBbXTtcbmNvbnN0IHNyYzogc3RyaW5nW10gPSBbXTtcbmxldCBSID0gMDtcblxuLy8gVGhlIGZvbGxvd2luZyBSZWd1bGFyIEV4cHJlc3Npb25zIGNhbiBiZSB1c2VkIGZvciB0b2tlbml6aW5nLFxuLy8gdmFsaWRhdGluZywgYW5kIHBhcnNpbmcgU2VtVmVyIHZlcnNpb24gc3RyaW5ncy5cblxuLy8gIyMgTnVtZXJpYyBJZGVudGlmaWVyXG4vLyBBIHNpbmdsZSBgMGAsIG9yIGEgbm9uLXplcm8gZGlnaXQgZm9sbG93ZWQgYnkgemVybyBvciBtb3JlIGRpZ2l0cy5cblxuY29uc3QgTlVNRVJJQ0lERU5USUZJRVI6IG51bWJlciA9IFIrKztcbnNyY1tOVU1FUklDSURFTlRJRklFUl0gPSBcIjB8WzEtOV1cXFxcZCpcIjtcblxuLy8gIyMgTm9uLW51bWVyaWMgSWRlbnRpZmllclxuLy8gWmVybyBvciBtb3JlIGRpZ2l0cywgZm9sbG93ZWQgYnkgYSBsZXR0ZXIgb3IgaHlwaGVuLCBhbmQgdGhlbiB6ZXJvIG9yXG4vLyBtb3JlIGxldHRlcnMsIGRpZ2l0cywgb3IgaHlwaGVucy5cblxuY29uc3QgTk9OTlVNRVJJQ0lERU5USUZJRVI6IG51bWJlciA9IFIrKztcbnNyY1tOT05OVU1FUklDSURFTlRJRklFUl0gPSBcIlxcXFxkKlthLXpBLVotXVthLXpBLVowLTktXSpcIjtcblxuLy8gIyMgTWFpbiBWZXJzaW9uXG4vLyBUaHJlZSBkb3Qtc2VwYXJhdGVkIG51bWVyaWMgaWRlbnRpZmllcnMuXG5cbmNvbnN0IE1BSU5WRVJTSU9OOiBudW1iZXIgPSBSKys7XG5jb25zdCBuaWQgPSBzcmNbTlVNRVJJQ0lERU5USUZJRVJdO1xuc3JjW01BSU5WRVJTSU9OXSA9IGAoJHtuaWR9KVxcXFwuKCR7bmlkfSlcXFxcLigke25pZH0pYDtcblxuLy8gIyMgUHJlLXJlbGVhc2UgVmVyc2lvbiBJZGVudGlmaWVyXG4vLyBBIG51bWVyaWMgaWRlbnRpZmllciwgb3IgYSBub24tbnVtZXJpYyBpZGVudGlmaWVyLlxuXG5jb25zdCBQUkVSRUxFQVNFSURFTlRJRklFUjogbnVtYmVyID0gUisrO1xuc3JjW1BSRVJFTEVBU0VJREVOVElGSUVSXSA9IFwiKD86XCIgKyBzcmNbTlVNRVJJQ0lERU5USUZJRVJdICsgXCJ8XCIgK1xuICBzcmNbTk9OTlVNRVJJQ0lERU5USUZJRVJdICsgXCIpXCI7XG5cbi8vICMjIFByZS1yZWxlYXNlIFZlcnNpb25cbi8vIEh5cGhlbiwgZm9sbG93ZWQgYnkgb25lIG9yIG1vcmUgZG90LXNlcGFyYXRlZCBwcmUtcmVsZWFzZSB2ZXJzaW9uXG4vLyBpZGVudGlmaWVycy5cblxuY29uc3QgUFJFUkVMRUFTRTogbnVtYmVyID0gUisrO1xuc3JjW1BSRVJFTEVBU0VdID0gXCIoPzotKFwiICtcbiAgc3JjW1BSRVJFTEVBU0VJREVOVElGSUVSXSArXG4gIFwiKD86XFxcXC5cIiArXG4gIHNyY1tQUkVSRUxFQVNFSURFTlRJRklFUl0gK1xuICBcIikqKSlcIjtcblxuLy8gIyMgQnVpbGQgTWV0YWRhdGEgSWRlbnRpZmllclxuLy8gQW55IGNvbWJpbmF0aW9uIG9mIGRpZ2l0cywgbGV0dGVycywgb3IgaHlwaGVucy5cblxuY29uc3QgQlVJTERJREVOVElGSUVSOiBudW1iZXIgPSBSKys7XG5zcmNbQlVJTERJREVOVElGSUVSXSA9IFwiWzAtOUEtWmEtei1dK1wiO1xuXG4vLyAjIyBCdWlsZCBNZXRhZGF0YVxuLy8gUGx1cyBzaWduLCBmb2xsb3dlZCBieSBvbmUgb3IgbW9yZSBwZXJpb2Qtc2VwYXJhdGVkIGJ1aWxkIG1ldGFkYXRhXG4vLyBpZGVudGlmaWVycy5cblxuY29uc3QgQlVJTEQ6IG51bWJlciA9IFIrKztcbnNyY1tCVUlMRF0gPSBcIig/OlxcXFwrKFwiICsgc3JjW0JVSUxESURFTlRJRklFUl0gKyBcIig/OlxcXFwuXCIgK1xuICBzcmNbQlVJTERJREVOVElGSUVSXSArIFwiKSopKVwiO1xuXG4vLyAjIyBGdWxsIFZlcnNpb24gU3RyaW5nXG4vLyBBIG1haW4gdmVyc2lvbiwgZm9sbG93ZWQgb3B0aW9uYWxseSBieSBhIHByZS1yZWxlYXNlIHZlcnNpb24gYW5kXG4vLyBidWlsZCBtZXRhZGF0YS5cblxuLy8gTm90ZSB0aGF0IHRoZSBvbmx5IG1ham9yLCBtaW5vciwgcGF0Y2gsIGFuZCBwcmUtcmVsZWFzZSBzZWN0aW9ucyBvZlxuLy8gdGhlIHZlcnNpb24gc3RyaW5nIGFyZSBjYXB0dXJpbmcgZ3JvdXBzLiAgVGhlIGJ1aWxkIG1ldGFkYXRhIGlzIG5vdCBhXG4vLyBjYXB0dXJpbmcgZ3JvdXAsIGJlY2F1c2UgaXQgc2hvdWxkIG5vdCBldmVyIGJlIHVzZWQgaW4gdmVyc2lvblxuLy8gY29tcGFyaXNvbi5cblxuY29uc3QgRlVMTDogbnVtYmVyID0gUisrO1xuY29uc3QgRlVMTFBMQUlOID0gXCJ2P1wiICsgc3JjW01BSU5WRVJTSU9OXSArIHNyY1tQUkVSRUxFQVNFXSArIFwiP1wiICsgc3JjW0JVSUxEXSArXG4gIFwiP1wiO1xuXG5zcmNbRlVMTF0gPSBcIl5cIiArIEZVTExQTEFJTiArIFwiJFwiO1xuXG5jb25zdCBHVExUOiBudW1iZXIgPSBSKys7XG5zcmNbR1RMVF0gPSBcIigoPzo8fD4pPz0/KVwiO1xuXG4vLyBTb21ldGhpbmcgbGlrZSBcIjIuKlwiIG9yIFwiMS4yLnhcIi5cbi8vIE5vdGUgdGhhdCBcIngueFwiIGlzIGEgdmFsaWQgeFJhbmdlIGlkZW50aWZlciwgbWVhbmluZyBcImFueSB2ZXJzaW9uXCJcbi8vIE9ubHkgdGhlIGZpcnN0IGl0ZW0gaXMgc3RyaWN0bHkgcmVxdWlyZWQuXG5jb25zdCBYUkFOR0VJREVOVElGSUVSOiBudW1iZXIgPSBSKys7XG5zcmNbWFJBTkdFSURFTlRJRklFUl0gPSBzcmNbTlVNRVJJQ0lERU5USUZJRVJdICsgXCJ8eHxYfFxcXFwqXCI7XG5cbmNvbnN0IFhSQU5HRVBMQUlOOiBudW1iZXIgPSBSKys7XG5zcmNbWFJBTkdFUExBSU5dID0gXCJbdj1cXFxcc10qKFwiICtcbiAgc3JjW1hSQU5HRUlERU5USUZJRVJdICtcbiAgXCIpXCIgK1xuICBcIig/OlxcXFwuKFwiICtcbiAgc3JjW1hSQU5HRUlERU5USUZJRVJdICtcbiAgXCIpXCIgK1xuICBcIig/OlxcXFwuKFwiICtcbiAgc3JjW1hSQU5HRUlERU5USUZJRVJdICtcbiAgXCIpXCIgK1xuICBcIig/OlwiICtcbiAgc3JjW1BSRVJFTEVBU0VdICtcbiAgXCIpP1wiICtcbiAgc3JjW0JVSUxEXSArXG4gIFwiP1wiICtcbiAgXCIpPyk/XCI7XG5cbmNvbnN0IFhSQU5HRTogbnVtYmVyID0gUisrO1xuc3JjW1hSQU5HRV0gPSBcIl5cIiArIHNyY1tHVExUXSArIFwiXFxcXHMqXCIgKyBzcmNbWFJBTkdFUExBSU5dICsgXCIkXCI7XG5cbi8vIFRpbGRlIHJhbmdlcy5cbi8vIE1lYW5pbmcgaXMgXCJyZWFzb25hYmx5IGF0IG9yIGdyZWF0ZXIgdGhhblwiXG5jb25zdCBMT05FVElMREU6IG51bWJlciA9IFIrKztcbnNyY1tMT05FVElMREVdID0gXCIoPzp+Pj8pXCI7XG5cbmNvbnN0IFRJTERFOiBudW1iZXIgPSBSKys7XG5zcmNbVElMREVdID0gXCJeXCIgKyBzcmNbTE9ORVRJTERFXSArIHNyY1tYUkFOR0VQTEFJTl0gKyBcIiRcIjtcblxuLy8gQ2FyZXQgcmFuZ2VzLlxuLy8gTWVhbmluZyBpcyBcImF0IGxlYXN0IGFuZCBiYWNrd2FyZHMgY29tcGF0aWJsZSB3aXRoXCJcbmNvbnN0IExPTkVDQVJFVDogbnVtYmVyID0gUisrO1xuc3JjW0xPTkVDQVJFVF0gPSBcIig/OlxcXFxeKVwiO1xuXG5jb25zdCBDQVJFVDogbnVtYmVyID0gUisrO1xuc3JjW0NBUkVUXSA9IFwiXlwiICsgc3JjW0xPTkVDQVJFVF0gKyBzcmNbWFJBTkdFUExBSU5dICsgXCIkXCI7XG5cbi8vIEEgc2ltcGxlIGd0L2x0L2VxIHRoaW5nLCBvciBqdXN0IFwiXCIgdG8gaW5kaWNhdGUgXCJhbnkgdmVyc2lvblwiXG5jb25zdCBDT01QQVJBVE9SOiBudW1iZXIgPSBSKys7XG5zcmNbQ09NUEFSQVRPUl0gPSBcIl5cIiArIHNyY1tHVExUXSArIFwiXFxcXHMqKFwiICsgRlVMTFBMQUlOICsgXCIpJHxeJFwiO1xuXG4vLyBTb21ldGhpbmcgbGlrZSBgMS4yLjMgLSAxLjIuNGBcbmNvbnN0IEhZUEhFTlJBTkdFOiBudW1iZXIgPSBSKys7XG5zcmNbSFlQSEVOUkFOR0VdID0gXCJeXFxcXHMqKFwiICtcbiAgc3JjW1hSQU5HRVBMQUlOXSArXG4gIFwiKVwiICtcbiAgXCJcXFxccystXFxcXHMrXCIgK1xuICBcIihcIiArXG4gIHNyY1tYUkFOR0VQTEFJTl0gK1xuICBcIilcIiArXG4gIFwiXFxcXHMqJFwiO1xuXG4vLyBTdGFyIHJhbmdlcyBiYXNpY2FsbHkganVzdCBhbGxvdyBhbnl0aGluZyBhdCBhbGwuXG5jb25zdCBTVEFSOiBudW1iZXIgPSBSKys7XG5zcmNbU1RBUl0gPSBcIig8fD4pPz0/XFxcXHMqXFxcXCpcIjtcblxuLy8gQ29tcGlsZSB0byBhY3R1YWwgcmVnZXhwIG9iamVjdHMuXG4vLyBBbGwgYXJlIGZsYWctZnJlZSwgdW5sZXNzIHRoZXkgd2VyZSBjcmVhdGVkIGFib3ZlIHdpdGggYSBmbGFnLlxuZm9yIChsZXQgaSA9IDA7IGkgPCBSOyBpKyspIHtcbiAgaWYgKCFyZVtpXSkge1xuICAgIHJlW2ldID0gbmV3IFJlZ0V4cChzcmNbaV0pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZShcbiAgdmVyc2lvbjogc3RyaW5nIHwgU2VtVmVyIHwgbnVsbCxcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiBTZW1WZXIgfCBudWxsIHtcbiAgaWYgKHR5cGVvZiBvcHRpb25zICE9PSBcIm9iamVjdFwiKSB7XG4gICAgb3B0aW9ucyA9IHtcbiAgICAgIGluY2x1ZGVQcmVyZWxlYXNlOiBmYWxzZSxcbiAgICB9O1xuICB9XG5cbiAgaWYgKHZlcnNpb24gaW5zdGFuY2VvZiBTZW1WZXIpIHtcbiAgICByZXR1cm4gdmVyc2lvbjtcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmVyc2lvbiAhPT0gXCJzdHJpbmdcIikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgaWYgKHZlcnNpb24ubGVuZ3RoID4gTUFYX0xFTkdUSCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgcjogUmVnRXhwID0gcmVbRlVMTF07XG4gIGlmICghci50ZXN0KHZlcnNpb24pKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICB0cnkge1xuICAgIHJldHVybiBuZXcgU2VtVmVyKHZlcnNpb24sIG9wdGlvbnMpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdmFsaWQoXG4gIHZlcnNpb246IHN0cmluZyB8IFNlbVZlciB8IG51bGwsXG4gIG9wdGlvbnM/OiBPcHRpb25zLFxuKTogc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2ZXJzaW9uID09PSBudWxsKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgdjogU2VtVmVyIHwgbnVsbCA9IHBhcnNlKHZlcnNpb24sIG9wdGlvbnMpO1xuICByZXR1cm4gdiA/IHYudmVyc2lvbiA6IG51bGw7XG59XG5cbmV4cG9ydCBjbGFzcyBTZW1WZXIge1xuICByYXchOiBzdHJpbmc7XG4gIG9wdGlvbnMhOiBPcHRpb25zO1xuXG4gIG1ham9yITogbnVtYmVyO1xuICBtaW5vciE6IG51bWJlcjtcbiAgcGF0Y2ghOiBudW1iZXI7XG4gIHZlcnNpb24hOiBzdHJpbmc7XG4gIGJ1aWxkITogUmVhZG9ubHlBcnJheTxzdHJpbmc+O1xuICBwcmVyZWxlYXNlITogQXJyYXk8c3RyaW5nIHwgbnVtYmVyPjtcblxuICBjb25zdHJ1Y3Rvcih2ZXJzaW9uOiBzdHJpbmcgfCBTZW1WZXIsIG9wdGlvbnM/OiBPcHRpb25zKSB7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zICE9PSBcIm9iamVjdFwiKSB7XG4gICAgICBvcHRpb25zID0ge1xuICAgICAgICBpbmNsdWRlUHJlcmVsZWFzZTogZmFsc2UsXG4gICAgICB9O1xuICAgIH1cbiAgICBpZiAodmVyc2lvbiBpbnN0YW5jZW9mIFNlbVZlcikge1xuICAgICAgdmVyc2lvbiA9IHZlcnNpb24udmVyc2lvbjtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB2ZXJzaW9uICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBWZXJzaW9uOiBcIiArIHZlcnNpb24pO1xuICAgIH1cblxuICAgIGlmICh2ZXJzaW9uLmxlbmd0aCA+IE1BWF9MRU5HVEgpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgIFwidmVyc2lvbiBpcyBsb25nZXIgdGhhbiBcIiArIE1BWF9MRU5HVEggKyBcIiBjaGFyYWN0ZXJzXCIsXG4gICAgICApO1xuICAgIH1cblxuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTZW1WZXIpKSB7XG4gICAgICByZXR1cm4gbmV3IFNlbVZlcih2ZXJzaW9uLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgY29uc3QgbSA9IHZlcnNpb24udHJpbSgpLm1hdGNoKHJlW0ZVTExdKTtcblxuICAgIGlmICghbSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkludmFsaWQgVmVyc2lvbjogXCIgKyB2ZXJzaW9uKTtcbiAgICB9XG5cbiAgICB0aGlzLnJhdyA9IHZlcnNpb247XG5cbiAgICAvLyB0aGVzZSBhcmUgYWN0dWFsbHkgbnVtYmVyc1xuICAgIHRoaXMubWFqb3IgPSArbVsxXTtcbiAgICB0aGlzLm1pbm9yID0gK21bMl07XG4gICAgdGhpcy5wYXRjaCA9ICttWzNdO1xuXG4gICAgaWYgKHRoaXMubWFqb3IgPiBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUiB8fCB0aGlzLm1ham9yIDwgMCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkludmFsaWQgbWFqb3IgdmVyc2lvblwiKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5taW5vciA+IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSIHx8IHRoaXMubWlub3IgPCAwKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBtaW5vciB2ZXJzaW9uXCIpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnBhdGNoID4gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIgfHwgdGhpcy5wYXRjaCA8IDApIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIHBhdGNoIHZlcnNpb25cIik7XG4gICAgfVxuXG4gICAgLy8gbnVtYmVyaWZ5IGFueSBwcmVyZWxlYXNlIG51bWVyaWMgaWRzXG4gICAgaWYgKCFtWzRdKSB7XG4gICAgICB0aGlzLnByZXJlbGVhc2UgPSBbXTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wcmVyZWxlYXNlID0gbVs0XS5zcGxpdChcIi5cIikubWFwKChpZDogc3RyaW5nKSA9PiB7XG4gICAgICAgIGlmICgvXlswLTldKyQvLnRlc3QoaWQpKSB7XG4gICAgICAgICAgY29uc3QgbnVtOiBudW1iZXIgPSAraWQ7XG4gICAgICAgICAgaWYgKG51bSA+PSAwICYmIG51bSA8IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVtO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaWQ7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLmJ1aWxkID0gbVs1XSA/IG1bNV0uc3BsaXQoXCIuXCIpIDogW107XG4gICAgdGhpcy5mb3JtYXQoKTtcbiAgfVxuXG4gIGZvcm1hdCgpOiBzdHJpbmcge1xuICAgIHRoaXMudmVyc2lvbiA9IHRoaXMubWFqb3IgKyBcIi5cIiArIHRoaXMubWlub3IgKyBcIi5cIiArIHRoaXMucGF0Y2g7XG4gICAgaWYgKHRoaXMucHJlcmVsZWFzZS5sZW5ndGgpIHtcbiAgICAgIHRoaXMudmVyc2lvbiArPSBcIi1cIiArIHRoaXMucHJlcmVsZWFzZS5qb2luKFwiLlwiKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMudmVyc2lvbjtcbiAgfVxuXG4gIGNvbXBhcmUob3RoZXI6IHN0cmluZyB8IFNlbVZlcik6IDEgfCAwIHwgLTEge1xuICAgIGlmICghKG90aGVyIGluc3RhbmNlb2YgU2VtVmVyKSkge1xuICAgICAgb3RoZXIgPSBuZXcgU2VtVmVyKG90aGVyLCB0aGlzLm9wdGlvbnMpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmNvbXBhcmVNYWluKG90aGVyKSB8fCB0aGlzLmNvbXBhcmVQcmUob3RoZXIpO1xuICB9XG5cbiAgY29tcGFyZU1haW4ob3RoZXI6IHN0cmluZyB8IFNlbVZlcik6IDEgfCAwIHwgLTEge1xuICAgIGlmICghKG90aGVyIGluc3RhbmNlb2YgU2VtVmVyKSkge1xuICAgICAgb3RoZXIgPSBuZXcgU2VtVmVyKG90aGVyLCB0aGlzLm9wdGlvbnMpO1xuICAgIH1cblxuICAgIHJldHVybiAoXG4gICAgICBjb21wYXJlSWRlbnRpZmllcnModGhpcy5tYWpvciwgb3RoZXIubWFqb3IpIHx8XG4gICAgICBjb21wYXJlSWRlbnRpZmllcnModGhpcy5taW5vciwgb3RoZXIubWlub3IpIHx8XG4gICAgICBjb21wYXJlSWRlbnRpZmllcnModGhpcy5wYXRjaCwgb3RoZXIucGF0Y2gpXG4gICAgKTtcbiAgfVxuXG4gIGNvbXBhcmVQcmUob3RoZXI6IHN0cmluZyB8IFNlbVZlcik6IDEgfCAwIHwgLTEge1xuICAgIGlmICghKG90aGVyIGluc3RhbmNlb2YgU2VtVmVyKSkge1xuICAgICAgb3RoZXIgPSBuZXcgU2VtVmVyKG90aGVyLCB0aGlzLm9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8vIE5PVCBoYXZpbmcgYSBwcmVyZWxlYXNlIGlzID4gaGF2aW5nIG9uZVxuICAgIGlmICh0aGlzLnByZXJlbGVhc2UubGVuZ3RoICYmICFvdGhlci5wcmVyZWxlYXNlLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIC0xO1xuICAgIH0gZWxzZSBpZiAoIXRoaXMucHJlcmVsZWFzZS5sZW5ndGggJiYgb3RoZXIucHJlcmVsZWFzZS5sZW5ndGgpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSBpZiAoIXRoaXMucHJlcmVsZWFzZS5sZW5ndGggJiYgIW90aGVyLnByZXJlbGVhc2UubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBsZXQgaSA9IDA7XG4gICAgZG8ge1xuICAgICAgY29uc3QgYTogc3RyaW5nIHwgbnVtYmVyID0gdGhpcy5wcmVyZWxlYXNlW2ldO1xuICAgICAgY29uc3QgYjogc3RyaW5nIHwgbnVtYmVyID0gb3RoZXIucHJlcmVsZWFzZVtpXTtcbiAgICAgIGlmIChhID09PSB1bmRlZmluZWQgJiYgYiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgICAgfSBlbHNlIGlmIChiID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9IGVsc2UgaWYgKGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9IGVsc2UgaWYgKGEgPT09IGIpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gY29tcGFyZUlkZW50aWZpZXJzKGEsIGIpO1xuICAgICAgfVxuICAgIH0gd2hpbGUgKCsraSk7XG4gICAgcmV0dXJuIDE7XG4gIH1cblxuICBjb21wYXJlQnVpbGQob3RoZXI6IHN0cmluZyB8IFNlbVZlcik6IDEgfCAwIHwgLTEge1xuICAgIGlmICghKG90aGVyIGluc3RhbmNlb2YgU2VtVmVyKSkge1xuICAgICAgb3RoZXIgPSBuZXcgU2VtVmVyKG90aGVyLCB0aGlzLm9wdGlvbnMpO1xuICAgIH1cblxuICAgIGxldCBpID0gMDtcbiAgICBkbyB7XG4gICAgICBjb25zdCBhOiBzdHJpbmcgPSB0aGlzLmJ1aWxkW2ldO1xuICAgICAgY29uc3QgYjogc3RyaW5nID0gb3RoZXIuYnVpbGRbaV07XG4gICAgICBpZiAoYSA9PT0gdW5kZWZpbmVkICYmIGIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH0gZWxzZSBpZiAoYiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfSBlbHNlIGlmIChhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgfSBlbHNlIGlmIChhID09PSBiKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGNvbXBhcmVJZGVudGlmaWVycyhhLCBiKTtcbiAgICAgIH1cbiAgICB9IHdoaWxlICgrK2kpO1xuICAgIHJldHVybiAxO1xuICB9XG5cbiAgaW5jKHJlbGVhc2U6IFJlbGVhc2VUeXBlLCBpZGVudGlmaWVyPzogc3RyaW5nKTogU2VtVmVyIHtcbiAgICBzd2l0Y2ggKHJlbGVhc2UpIHtcbiAgICAgIGNhc2UgXCJwcmVtYWpvclwiOlxuICAgICAgICB0aGlzLnByZXJlbGVhc2UubGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5wYXRjaCA9IDA7XG4gICAgICAgIHRoaXMubWlub3IgPSAwO1xuICAgICAgICB0aGlzLm1ham9yKys7XG4gICAgICAgIHRoaXMuaW5jKFwicHJlXCIsIGlkZW50aWZpZXIpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJwcmVtaW5vclwiOlxuICAgICAgICB0aGlzLnByZXJlbGVhc2UubGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5wYXRjaCA9IDA7XG4gICAgICAgIHRoaXMubWlub3IrKztcbiAgICAgICAgdGhpcy5pbmMoXCJwcmVcIiwgaWRlbnRpZmllcik7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcInByZXBhdGNoXCI6XG4gICAgICAgIC8vIElmIHRoaXMgaXMgYWxyZWFkeSBhIHByZXJlbGVhc2UsIGl0IHdpbGwgYnVtcCB0byB0aGUgbmV4dCB2ZXJzaW9uXG4gICAgICAgIC8vIGRyb3AgYW55IHByZXJlbGVhc2VzIHRoYXQgbWlnaHQgYWxyZWFkeSBleGlzdCwgc2luY2UgdGhleSBhcmUgbm90XG4gICAgICAgIC8vIHJlbGV2YW50IGF0IHRoaXMgcG9pbnQuXG4gICAgICAgIHRoaXMucHJlcmVsZWFzZS5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLmluYyhcInBhdGNoXCIsIGlkZW50aWZpZXIpO1xuICAgICAgICB0aGlzLmluYyhcInByZVwiLCBpZGVudGlmaWVyKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBJZiB0aGUgaW5wdXQgaXMgYSBub24tcHJlcmVsZWFzZSB2ZXJzaW9uLCB0aGlzIGFjdHMgdGhlIHNhbWUgYXNcbiAgICAgIC8vIHByZXBhdGNoLlxuICAgICAgY2FzZSBcInByZXJlbGVhc2VcIjpcbiAgICAgICAgaWYgKHRoaXMucHJlcmVsZWFzZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICB0aGlzLmluYyhcInBhdGNoXCIsIGlkZW50aWZpZXIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaW5jKFwicHJlXCIsIGlkZW50aWZpZXIpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBcIm1ham9yXCI6XG4gICAgICAgIC8vIElmIHRoaXMgaXMgYSBwcmUtbWFqb3IgdmVyc2lvbiwgYnVtcCB1cCB0byB0aGUgc2FtZSBtYWpvciB2ZXJzaW9uLlxuICAgICAgICAvLyBPdGhlcndpc2UgaW5jcmVtZW50IG1ham9yLlxuICAgICAgICAvLyAxLjAuMC01IGJ1bXBzIHRvIDEuMC4wXG4gICAgICAgIC8vIDEuMS4wIGJ1bXBzIHRvIDIuMC4wXG4gICAgICAgIGlmIChcbiAgICAgICAgICB0aGlzLm1pbm9yICE9PSAwIHx8XG4gICAgICAgICAgdGhpcy5wYXRjaCAhPT0gMCB8fFxuICAgICAgICAgIHRoaXMucHJlcmVsZWFzZS5sZW5ndGggPT09IDBcbiAgICAgICAgKSB7XG4gICAgICAgICAgdGhpcy5tYWpvcisrO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubWlub3IgPSAwO1xuICAgICAgICB0aGlzLnBhdGNoID0gMDtcbiAgICAgICAgdGhpcy5wcmVyZWxlYXNlID0gW107XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcIm1pbm9yXCI6XG4gICAgICAgIC8vIElmIHRoaXMgaXMgYSBwcmUtbWlub3IgdmVyc2lvbiwgYnVtcCB1cCB0byB0aGUgc2FtZSBtaW5vciB2ZXJzaW9uLlxuICAgICAgICAvLyBPdGhlcndpc2UgaW5jcmVtZW50IG1pbm9yLlxuICAgICAgICAvLyAxLjIuMC01IGJ1bXBzIHRvIDEuMi4wXG4gICAgICAgIC8vIDEuMi4xIGJ1bXBzIHRvIDEuMy4wXG4gICAgICAgIGlmICh0aGlzLnBhdGNoICE9PSAwIHx8IHRoaXMucHJlcmVsZWFzZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICB0aGlzLm1pbm9yKys7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wYXRjaCA9IDA7XG4gICAgICAgIHRoaXMucHJlcmVsZWFzZSA9IFtdO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJwYXRjaFwiOlxuICAgICAgICAvLyBJZiB0aGlzIGlzIG5vdCBhIHByZS1yZWxlYXNlIHZlcnNpb24sIGl0IHdpbGwgaW5jcmVtZW50IHRoZSBwYXRjaC5cbiAgICAgICAgLy8gSWYgaXQgaXMgYSBwcmUtcmVsZWFzZSBpdCB3aWxsIGJ1bXAgdXAgdG8gdGhlIHNhbWUgcGF0Y2ggdmVyc2lvbi5cbiAgICAgICAgLy8gMS4yLjAtNSBwYXRjaGVzIHRvIDEuMi4wXG4gICAgICAgIC8vIDEuMi4wIHBhdGNoZXMgdG8gMS4yLjFcbiAgICAgICAgaWYgKHRoaXMucHJlcmVsZWFzZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICB0aGlzLnBhdGNoKys7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wcmVyZWxlYXNlID0gW107XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gVGhpcyBwcm9iYWJseSBzaG91bGRuJ3QgYmUgdXNlZCBwdWJsaWNseS5cbiAgICAgIC8vIDEuMC4wIFwicHJlXCIgd291bGQgYmVjb21lIDEuMC4wLTAgd2hpY2ggaXMgdGhlIHdyb25nIGRpcmVjdGlvbi5cbiAgICAgIGNhc2UgXCJwcmVcIjpcbiAgICAgICAgaWYgKHRoaXMucHJlcmVsZWFzZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICB0aGlzLnByZXJlbGVhc2UgPSBbMF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGV0IGk6IG51bWJlciA9IHRoaXMucHJlcmVsZWFzZS5sZW5ndGg7XG4gICAgICAgICAgd2hpbGUgKC0taSA+PSAwKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMucHJlcmVsZWFzZVtpXSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgICAvLyBkZW5vLWZtdC1pZ25vcmVcbiAgICAgICAgICAgICAgKHRoaXMucHJlcmVsZWFzZVtpXSBhcyBudW1iZXIpKys7XG4gICAgICAgICAgICAgIGkgPSAtMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGkgPT09IC0xKSB7XG4gICAgICAgICAgICAvLyBkaWRuJ3QgaW5jcmVtZW50IGFueXRoaW5nXG4gICAgICAgICAgICB0aGlzLnByZXJlbGVhc2UucHVzaCgwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkZW50aWZpZXIpIHtcbiAgICAgICAgICAvLyAxLjIuMC1iZXRhLjEgYnVtcHMgdG8gMS4yLjAtYmV0YS4yLFxuICAgICAgICAgIC8vIDEuMi4wLWJldGEuZm9vYmx6IG9yIDEuMi4wLWJldGEgYnVtcHMgdG8gMS4yLjAtYmV0YS4wXG4gICAgICAgICAgaWYgKHRoaXMucHJlcmVsZWFzZVswXSA9PT0gaWRlbnRpZmllcikge1xuICAgICAgICAgICAgaWYgKGlzTmFOKHRoaXMucHJlcmVsZWFzZVsxXSBhcyBudW1iZXIpKSB7XG4gICAgICAgICAgICAgIHRoaXMucHJlcmVsZWFzZSA9IFtpZGVudGlmaWVyLCAwXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5wcmVyZWxlYXNlID0gW2lkZW50aWZpZXIsIDBdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVhaztcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCBpbmNyZW1lbnQgYXJndW1lbnQ6IFwiICsgcmVsZWFzZSk7XG4gICAgfVxuICAgIHRoaXMuZm9ybWF0KCk7XG4gICAgdGhpcy5yYXcgPSB0aGlzLnZlcnNpb247XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnZlcnNpb247XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm4gdGhlIHZlcnNpb24gaW5jcmVtZW50ZWQgYnkgdGhlIHJlbGVhc2UgdHlwZSAobWFqb3IsIG1pbm9yLCBwYXRjaCwgb3IgcHJlcmVsZWFzZSksIG9yIG51bGwgaWYgaXQncyBub3QgdmFsaWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbmMoXG4gIHZlcnNpb246IHN0cmluZyB8IFNlbVZlcixcbiAgcmVsZWFzZTogUmVsZWFzZVR5cGUsXG4gIG9wdGlvbnM/OiBPcHRpb25zLFxuICBpZGVudGlmaWVyPzogc3RyaW5nLFxuKTogc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJzdHJpbmdcIikge1xuICAgIGlkZW50aWZpZXIgPSBvcHRpb25zO1xuICAgIG9wdGlvbnMgPSB1bmRlZmluZWQ7XG4gIH1cbiAgdHJ5IHtcbiAgICByZXR1cm4gbmV3IFNlbVZlcih2ZXJzaW9uLCBvcHRpb25zKS5pbmMocmVsZWFzZSwgaWRlbnRpZmllcikudmVyc2lvbjtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRpZmYoXG4gIHZlcnNpb24xOiBzdHJpbmcgfCBTZW1WZXIsXG4gIHZlcnNpb24yOiBzdHJpbmcgfCBTZW1WZXIsXG4gIG9wdGlvbnM/OiBPcHRpb25zLFxuKTogUmVsZWFzZVR5cGUgfCBudWxsIHtcbiAgaWYgKGVxKHZlcnNpb24xLCB2ZXJzaW9uMiwgb3B0aW9ucykpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCB2MTogU2VtVmVyIHwgbnVsbCA9IHBhcnNlKHZlcnNpb24xKTtcbiAgICBjb25zdCB2MjogU2VtVmVyIHwgbnVsbCA9IHBhcnNlKHZlcnNpb24yKTtcbiAgICBsZXQgcHJlZml4ID0gXCJcIjtcbiAgICBsZXQgZGVmYXVsdFJlc3VsdDogUmVsZWFzZVR5cGUgfCBudWxsID0gbnVsbDtcblxuICAgIGlmICh2MSAmJiB2Mikge1xuICAgICAgaWYgKHYxLnByZXJlbGVhc2UubGVuZ3RoIHx8IHYyLnByZXJlbGVhc2UubGVuZ3RoKSB7XG4gICAgICAgIHByZWZpeCA9IFwicHJlXCI7XG4gICAgICAgIGRlZmF1bHRSZXN1bHQgPSBcInByZXJlbGVhc2VcIjtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBrZXkgaW4gdjEpIHtcbiAgICAgICAgaWYgKGtleSA9PT0gXCJtYWpvclwiIHx8IGtleSA9PT0gXCJtaW5vclwiIHx8IGtleSA9PT0gXCJwYXRjaFwiKSB7XG4gICAgICAgICAgaWYgKHYxW2tleV0gIT09IHYyW2tleV0pIHtcbiAgICAgICAgICAgIHJldHVybiAocHJlZml4ICsga2V5KSBhcyBSZWxlYXNlVHlwZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRlZmF1bHRSZXN1bHQ7IC8vIG1heSBiZSB1bmRlZmluZWRcbiAgfVxufVxuXG5jb25zdCBudW1lcmljID0gL15bMC05XSskLztcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmVJZGVudGlmaWVycyhcbiAgYTogc3RyaW5nIHwgbnVtYmVyIHwgbnVsbCxcbiAgYjogc3RyaW5nIHwgbnVtYmVyIHwgbnVsbCxcbik6IDEgfCAwIHwgLTEge1xuICBjb25zdCBhbnVtOiBib29sZWFuID0gbnVtZXJpYy50ZXN0KGEgYXMgc3RyaW5nKTtcbiAgY29uc3QgYm51bTogYm9vbGVhbiA9IG51bWVyaWMudGVzdChiIGFzIHN0cmluZyk7XG5cbiAgaWYgKGEgPT09IG51bGwgfHwgYiA9PT0gbnVsbCkgdGhyb3cgXCJDb21wYXJpc29uIGFnYWluc3QgbnVsbCBpbnZhbGlkXCI7XG5cbiAgaWYgKGFudW0gJiYgYm51bSkge1xuICAgIGEgPSArYTtcbiAgICBiID0gK2I7XG4gIH1cblxuICByZXR1cm4gYSA9PT0gYiA/IDAgOiBhbnVtICYmICFibnVtID8gLTEgOiBibnVtICYmICFhbnVtID8gMSA6IGEgPCBiID8gLTEgOiAxO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmNvbXBhcmVJZGVudGlmaWVycyhcbiAgYTogc3RyaW5nIHwgbnVsbCxcbiAgYjogc3RyaW5nIHwgbnVsbCxcbik6IDEgfCAwIHwgLTEge1xuICByZXR1cm4gY29tcGFyZUlkZW50aWZpZXJzKGIsIGEpO1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgbWFqb3IgdmVyc2lvbiBudW1iZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWpvcihcbiAgdjogc3RyaW5nIHwgU2VtVmVyLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IG51bWJlciB7XG4gIHJldHVybiBuZXcgU2VtVmVyKHYsIG9wdGlvbnMpLm1ham9yO1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgbWlub3IgdmVyc2lvbiBudW1iZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtaW5vcihcbiAgdjogc3RyaW5nIHwgU2VtVmVyLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IG51bWJlciB7XG4gIHJldHVybiBuZXcgU2VtVmVyKHYsIG9wdGlvbnMpLm1pbm9yO1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgcGF0Y2ggdmVyc2lvbiBudW1iZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXRjaChcbiAgdjogc3RyaW5nIHwgU2VtVmVyLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IG51bWJlciB7XG4gIHJldHVybiBuZXcgU2VtVmVyKHYsIG9wdGlvbnMpLnBhdGNoO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZShcbiAgdjE6IHN0cmluZyB8IFNlbVZlcixcbiAgdjI6IHN0cmluZyB8IFNlbVZlcixcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiAxIHwgMCB8IC0xIHtcbiAgcmV0dXJuIG5ldyBTZW1WZXIodjEsIG9wdGlvbnMpLmNvbXBhcmUobmV3IFNlbVZlcih2Miwgb3B0aW9ucykpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZUJ1aWxkKFxuICBhOiBzdHJpbmcgfCBTZW1WZXIsXG4gIGI6IHN0cmluZyB8IFNlbVZlcixcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiAxIHwgMCB8IC0xIHtcbiAgY29uc3QgdmVyc2lvbkEgPSBuZXcgU2VtVmVyKGEsIG9wdGlvbnMpO1xuICBjb25zdCB2ZXJzaW9uQiA9IG5ldyBTZW1WZXIoYiwgb3B0aW9ucyk7XG4gIHJldHVybiB2ZXJzaW9uQS5jb21wYXJlKHZlcnNpb25CKSB8fCB2ZXJzaW9uQS5jb21wYXJlQnVpbGQodmVyc2lvbkIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmNvbXBhcmUoXG4gIHYxOiBzdHJpbmcgfCBTZW1WZXIsXG4gIHYyOiBzdHJpbmcgfCBTZW1WZXIsXG4gIG9wdGlvbnM/OiBPcHRpb25zLFxuKTogMSB8IDAgfCAtMSB7XG4gIHJldHVybiBjb21wYXJlKHYyLCB2MSwgb3B0aW9ucyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzb3J0PFQgZXh0ZW5kcyBzdHJpbmcgfCBTZW1WZXI+KFxuICBsaXN0OiBUW10sXG4gIG9wdGlvbnM/OiBPcHRpb25zLFxuKTogVFtdIHtcbiAgcmV0dXJuIGxpc3Quc29ydCgoYSwgYikgPT4ge1xuICAgIHJldHVybiBjb21wYXJlQnVpbGQoYSwgYiwgb3B0aW9ucyk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcnNvcnQ8VCBleHRlbmRzIHN0cmluZyB8IFNlbVZlcj4oXG4gIGxpc3Q6IFRbXSxcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiBUW10ge1xuICByZXR1cm4gbGlzdC5zb3J0KChhLCBiKSA9PiB7XG4gICAgcmV0dXJuIGNvbXBhcmVCdWlsZChiLCBhLCBvcHRpb25zKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBndChcbiAgdjE6IHN0cmluZyB8IFNlbVZlcixcbiAgdjI6IHN0cmluZyB8IFNlbVZlcixcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiBib29sZWFuIHtcbiAgcmV0dXJuIGNvbXBhcmUodjEsIHYyLCBvcHRpb25zKSA+IDA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsdChcbiAgdjE6IHN0cmluZyB8IFNlbVZlcixcbiAgdjI6IHN0cmluZyB8IFNlbVZlcixcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiBib29sZWFuIHtcbiAgcmV0dXJuIGNvbXBhcmUodjEsIHYyLCBvcHRpb25zKSA8IDA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlcShcbiAgdjE6IHN0cmluZyB8IFNlbVZlcixcbiAgdjI6IHN0cmluZyB8IFNlbVZlcixcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiBib29sZWFuIHtcbiAgcmV0dXJuIGNvbXBhcmUodjEsIHYyLCBvcHRpb25zKSA9PT0gMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5lcShcbiAgdjE6IHN0cmluZyB8IFNlbVZlcixcbiAgdjI6IHN0cmluZyB8IFNlbVZlcixcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiBib29sZWFuIHtcbiAgcmV0dXJuIGNvbXBhcmUodjEsIHYyLCBvcHRpb25zKSAhPT0gMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGd0ZShcbiAgdjE6IHN0cmluZyB8IFNlbVZlcixcbiAgdjI6IHN0cmluZyB8IFNlbVZlcixcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiBib29sZWFuIHtcbiAgcmV0dXJuIGNvbXBhcmUodjEsIHYyLCBvcHRpb25zKSA+PSAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbHRlKFxuICB2MTogc3RyaW5nIHwgU2VtVmVyLFxuICB2Mjogc3RyaW5nIHwgU2VtVmVyLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IGJvb2xlYW4ge1xuICByZXR1cm4gY29tcGFyZSh2MSwgdjIsIG9wdGlvbnMpIDw9IDA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbXAoXG4gIHYxOiBzdHJpbmcgfCBTZW1WZXIsXG4gIG9wZXJhdG9yOiBPcGVyYXRvcixcbiAgdjI6IHN0cmluZyB8IFNlbVZlcixcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiBib29sZWFuIHtcbiAgc3dpdGNoIChvcGVyYXRvcikge1xuICAgIGNhc2UgXCI9PT1cIjpcbiAgICAgIGlmICh0eXBlb2YgdjEgPT09IFwib2JqZWN0XCIpIHYxID0gdjEudmVyc2lvbjtcbiAgICAgIGlmICh0eXBlb2YgdjIgPT09IFwib2JqZWN0XCIpIHYyID0gdjIudmVyc2lvbjtcbiAgICAgIHJldHVybiB2MSA9PT0gdjI7XG5cbiAgICBjYXNlIFwiIT09XCI6XG4gICAgICBpZiAodHlwZW9mIHYxID09PSBcIm9iamVjdFwiKSB2MSA9IHYxLnZlcnNpb247XG4gICAgICBpZiAodHlwZW9mIHYyID09PSBcIm9iamVjdFwiKSB2MiA9IHYyLnZlcnNpb247XG4gICAgICByZXR1cm4gdjEgIT09IHYyO1xuXG4gICAgY2FzZSBcIlwiOlxuICAgIGNhc2UgXCI9XCI6XG4gICAgY2FzZSBcIj09XCI6XG4gICAgICByZXR1cm4gZXEodjEsIHYyLCBvcHRpb25zKTtcblxuICAgIGNhc2UgXCIhPVwiOlxuICAgICAgcmV0dXJuIG5lcSh2MSwgdjIsIG9wdGlvbnMpO1xuXG4gICAgY2FzZSBcIj5cIjpcbiAgICAgIHJldHVybiBndCh2MSwgdjIsIG9wdGlvbnMpO1xuXG4gICAgY2FzZSBcIj49XCI6XG4gICAgICByZXR1cm4gZ3RlKHYxLCB2Miwgb3B0aW9ucyk7XG5cbiAgICBjYXNlIFwiPFwiOlxuICAgICAgcmV0dXJuIGx0KHYxLCB2Miwgb3B0aW9ucyk7XG5cbiAgICBjYXNlIFwiPD1cIjpcbiAgICAgIHJldHVybiBsdGUodjEsIHYyLCBvcHRpb25zKTtcblxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBvcGVyYXRvcjogXCIgKyBvcGVyYXRvcik7XG4gIH1cbn1cblxuY29uc3QgQU5ZOiBTZW1WZXIgPSB7fSBhcyBTZW1WZXI7XG5cbmV4cG9ydCBjbGFzcyBDb21wYXJhdG9yIHtcbiAgc2VtdmVyITogU2VtVmVyO1xuICBvcGVyYXRvciE6IFwiXCIgfCBcIj1cIiB8IFwiPFwiIHwgXCI+XCIgfCBcIjw9XCIgfCBcIj49XCI7XG4gIHZhbHVlITogc3RyaW5nO1xuICBvcHRpb25zITogT3B0aW9ucztcblxuICBjb25zdHJ1Y3Rvcihjb21wOiBzdHJpbmcgfCBDb21wYXJhdG9yLCBvcHRpb25zPzogT3B0aW9ucykge1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyAhPT0gXCJvYmplY3RcIikge1xuICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgaW5jbHVkZVByZXJlbGVhc2U6IGZhbHNlLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoY29tcCBpbnN0YW5jZW9mIENvbXBhcmF0b3IpIHtcbiAgICAgIHJldHVybiBjb21wO1xuICAgIH1cblxuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBDb21wYXJhdG9yKSkge1xuICAgICAgcmV0dXJuIG5ldyBDb21wYXJhdG9yKGNvbXAsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5wYXJzZShjb21wKTtcblxuICAgIGlmICh0aGlzLnNlbXZlciA9PT0gQU5ZKSB7XG4gICAgICB0aGlzLnZhbHVlID0gXCJcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy52YWx1ZSA9IHRoaXMub3BlcmF0b3IgKyB0aGlzLnNlbXZlci52ZXJzaW9uO1xuICAgIH1cbiAgfVxuXG4gIHBhcnNlKGNvbXA6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IHIgPSByZVtDT01QQVJBVE9SXTtcbiAgICBjb25zdCBtID0gY29tcC5tYXRjaChyKTtcblxuICAgIGlmICghbSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkludmFsaWQgY29tcGFyYXRvcjogXCIgKyBjb21wKTtcbiAgICB9XG5cbiAgICBjb25zdCBtMSA9IG1bMV0gYXMgXCJcIiB8IFwiPVwiIHwgXCI8XCIgfCBcIj5cIiB8IFwiPD1cIiB8IFwiPj1cIjtcbiAgICB0aGlzLm9wZXJhdG9yID0gbTEgIT09IHVuZGVmaW5lZCA/IG0xIDogXCJcIjtcblxuICAgIGlmICh0aGlzLm9wZXJhdG9yID09PSBcIj1cIikge1xuICAgICAgdGhpcy5vcGVyYXRvciA9IFwiXCI7XG4gICAgfVxuXG4gICAgLy8gaWYgaXQgbGl0ZXJhbGx5IGlzIGp1c3QgJz4nIG9yICcnIHRoZW4gYWxsb3cgYW55dGhpbmcuXG4gICAgaWYgKCFtWzJdKSB7XG4gICAgICB0aGlzLnNlbXZlciA9IEFOWTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zZW12ZXIgPSBuZXcgU2VtVmVyKG1bMl0sIHRoaXMub3B0aW9ucyk7XG4gICAgfVxuICB9XG5cbiAgdGVzdCh2ZXJzaW9uOiBzdHJpbmcgfCBTZW1WZXIpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5zZW12ZXIgPT09IEFOWSB8fCB2ZXJzaW9uID09PSBBTlkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdmVyc2lvbiA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgdmVyc2lvbiA9IG5ldyBTZW1WZXIodmVyc2lvbiwgdGhpcy5vcHRpb25zKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY21wKHZlcnNpb24sIHRoaXMub3BlcmF0b3IsIHRoaXMuc2VtdmVyLCB0aGlzLm9wdGlvbnMpO1xuICB9XG5cbiAgaW50ZXJzZWN0cyhjb21wOiBDb21wYXJhdG9yLCBvcHRpb25zPzogT3B0aW9ucyk6IGJvb2xlYW4ge1xuICAgIGlmICghKGNvbXAgaW5zdGFuY2VvZiBDb21wYXJhdG9yKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImEgQ29tcGFyYXRvciBpcyByZXF1aXJlZFwiKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgIT09IFwib2JqZWN0XCIpIHtcbiAgICAgIG9wdGlvbnMgPSB7XG4gICAgICAgIGluY2x1ZGVQcmVyZWxlYXNlOiBmYWxzZSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgbGV0IHJhbmdlVG1wOiBSYW5nZTtcblxuICAgIGlmICh0aGlzLm9wZXJhdG9yID09PSBcIlwiKSB7XG4gICAgICBpZiAodGhpcy52YWx1ZSA9PT0gXCJcIikge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJhbmdlVG1wID0gbmV3IFJhbmdlKGNvbXAudmFsdWUsIG9wdGlvbnMpO1xuICAgICAgcmV0dXJuIHNhdGlzZmllcyh0aGlzLnZhbHVlLCByYW5nZVRtcCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIGlmIChjb21wLm9wZXJhdG9yID09PSBcIlwiKSB7XG4gICAgICBpZiAoY29tcC52YWx1ZSA9PT0gXCJcIikge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJhbmdlVG1wID0gbmV3IFJhbmdlKHRoaXMudmFsdWUsIG9wdGlvbnMpO1xuICAgICAgcmV0dXJuIHNhdGlzZmllcyhjb21wLnNlbXZlciwgcmFuZ2VUbXAsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGNvbnN0IHNhbWVEaXJlY3Rpb25JbmNyZWFzaW5nOiBib29sZWFuID1cbiAgICAgICh0aGlzLm9wZXJhdG9yID09PSBcIj49XCIgfHwgdGhpcy5vcGVyYXRvciA9PT0gXCI+XCIpICYmXG4gICAgICAoY29tcC5vcGVyYXRvciA9PT0gXCI+PVwiIHx8IGNvbXAub3BlcmF0b3IgPT09IFwiPlwiKTtcbiAgICBjb25zdCBzYW1lRGlyZWN0aW9uRGVjcmVhc2luZzogYm9vbGVhbiA9XG4gICAgICAodGhpcy5vcGVyYXRvciA9PT0gXCI8PVwiIHx8IHRoaXMub3BlcmF0b3IgPT09IFwiPFwiKSAmJlxuICAgICAgKGNvbXAub3BlcmF0b3IgPT09IFwiPD1cIiB8fCBjb21wLm9wZXJhdG9yID09PSBcIjxcIik7XG4gICAgY29uc3Qgc2FtZVNlbVZlcjogYm9vbGVhbiA9IHRoaXMuc2VtdmVyLnZlcnNpb24gPT09IGNvbXAuc2VtdmVyLnZlcnNpb247XG4gICAgY29uc3QgZGlmZmVyZW50RGlyZWN0aW9uc0luY2x1c2l2ZTogYm9vbGVhbiA9XG4gICAgICAodGhpcy5vcGVyYXRvciA9PT0gXCI+PVwiIHx8IHRoaXMub3BlcmF0b3IgPT09IFwiPD1cIikgJiZcbiAgICAgIChjb21wLm9wZXJhdG9yID09PSBcIj49XCIgfHwgY29tcC5vcGVyYXRvciA9PT0gXCI8PVwiKTtcbiAgICBjb25zdCBvcHBvc2l0ZURpcmVjdGlvbnNMZXNzVGhhbjogYm9vbGVhbiA9XG4gICAgICBjbXAodGhpcy5zZW12ZXIsIFwiPFwiLCBjb21wLnNlbXZlciwgb3B0aW9ucykgJiZcbiAgICAgICh0aGlzLm9wZXJhdG9yID09PSBcIj49XCIgfHwgdGhpcy5vcGVyYXRvciA9PT0gXCI+XCIpICYmXG4gICAgICAoY29tcC5vcGVyYXRvciA9PT0gXCI8PVwiIHx8IGNvbXAub3BlcmF0b3IgPT09IFwiPFwiKTtcbiAgICBjb25zdCBvcHBvc2l0ZURpcmVjdGlvbnNHcmVhdGVyVGhhbjogYm9vbGVhbiA9XG4gICAgICBjbXAodGhpcy5zZW12ZXIsIFwiPlwiLCBjb21wLnNlbXZlciwgb3B0aW9ucykgJiZcbiAgICAgICh0aGlzLm9wZXJhdG9yID09PSBcIjw9XCIgfHwgdGhpcy5vcGVyYXRvciA9PT0gXCI8XCIpICYmXG4gICAgICAoY29tcC5vcGVyYXRvciA9PT0gXCI+PVwiIHx8IGNvbXAub3BlcmF0b3IgPT09IFwiPlwiKTtcblxuICAgIHJldHVybiAoXG4gICAgICBzYW1lRGlyZWN0aW9uSW5jcmVhc2luZyB8fFxuICAgICAgc2FtZURpcmVjdGlvbkRlY3JlYXNpbmcgfHxcbiAgICAgIChzYW1lU2VtVmVyICYmIGRpZmZlcmVudERpcmVjdGlvbnNJbmNsdXNpdmUpIHx8XG4gICAgICBvcHBvc2l0ZURpcmVjdGlvbnNMZXNzVGhhbiB8fFxuICAgICAgb3Bwb3NpdGVEaXJlY3Rpb25zR3JlYXRlclRoYW5cbiAgICApO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgUmFuZ2Uge1xuICByYW5nZSE6IHN0cmluZztcbiAgcmF3ITogc3RyaW5nO1xuICBvcHRpb25zITogT3B0aW9ucztcbiAgaW5jbHVkZVByZXJlbGVhc2UhOiBib29sZWFuO1xuICBzZXQhOiBSZWFkb25seUFycmF5PFJlYWRvbmx5QXJyYXk8Q29tcGFyYXRvcj4+O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHJhbmdlOiBzdHJpbmcgfCBSYW5nZSB8IENvbXBhcmF0b3IsXG4gICAgb3B0aW9ucz86IE9wdGlvbnMsXG4gICkge1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyAhPT0gXCJvYmplY3RcIikge1xuICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgaW5jbHVkZVByZXJlbGVhc2U6IGZhbHNlLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAocmFuZ2UgaW5zdGFuY2VvZiBSYW5nZSkge1xuICAgICAgaWYgKFxuICAgICAgICByYW5nZS5pbmNsdWRlUHJlcmVsZWFzZSA9PT0gISFvcHRpb25zLmluY2x1ZGVQcmVyZWxlYXNlXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIHJhbmdlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSYW5nZShyYW5nZS5yYXcsIG9wdGlvbnMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChyYW5nZSBpbnN0YW5jZW9mIENvbXBhcmF0b3IpIHtcbiAgICAgIHJldHVybiBuZXcgUmFuZ2UocmFuZ2UudmFsdWUsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBSYW5nZSkpIHtcbiAgICAgIHJldHVybiBuZXcgUmFuZ2UocmFuZ2UsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5pbmNsdWRlUHJlcmVsZWFzZSA9ICEhb3B0aW9ucy5pbmNsdWRlUHJlcmVsZWFzZTtcblxuICAgIC8vIEZpcnN0LCBzcGxpdCBiYXNlZCBvbiBib29sZWFuIG9yIHx8XG4gICAgdGhpcy5yYXcgPSByYW5nZTtcbiAgICB0aGlzLnNldCA9IHJhbmdlXG4gICAgICAuc3BsaXQoL1xccypcXHxcXHxcXHMqLylcbiAgICAgIC5tYXAoKHJhbmdlKSA9PiB0aGlzLnBhcnNlUmFuZ2UocmFuZ2UudHJpbSgpKSlcbiAgICAgIC5maWx0ZXIoKGMpID0+IHtcbiAgICAgICAgLy8gdGhyb3cgb3V0IGFueSB0aGF0IGFyZSBub3QgcmVsZXZhbnQgZm9yIHdoYXRldmVyIHJlYXNvblxuICAgICAgICByZXR1cm4gYy5sZW5ndGg7XG4gICAgICB9KTtcblxuICAgIGlmICghdGhpcy5zZXQubGVuZ3RoKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBTZW1WZXIgUmFuZ2U6IFwiICsgcmFuZ2UpO1xuICAgIH1cblxuICAgIHRoaXMuZm9ybWF0KCk7XG4gIH1cblxuICBmb3JtYXQoKTogc3RyaW5nIHtcbiAgICB0aGlzLnJhbmdlID0gdGhpcy5zZXRcbiAgICAgIC5tYXAoKGNvbXBzKSA9PiBjb21wcy5qb2luKFwiIFwiKS50cmltKCkpXG4gICAgICAuam9pbihcInx8XCIpXG4gICAgICAudHJpbSgpO1xuICAgIHJldHVybiB0aGlzLnJhbmdlO1xuICB9XG5cbiAgcGFyc2VSYW5nZShyYW5nZTogc3RyaW5nKTogUmVhZG9ubHlBcnJheTxDb21wYXJhdG9yPiB7XG4gICAgcmFuZ2UgPSByYW5nZS50cmltKCk7XG4gICAgLy8gYDEuMi4zIC0gMS4yLjRgID0+IGA+PTEuMi4zIDw9MS4yLjRgXG4gICAgY29uc3QgaHI6IFJlZ0V4cCA9IHJlW0hZUEhFTlJBTkdFXTtcbiAgICByYW5nZSA9IHJhbmdlLnJlcGxhY2UoaHIsIGh5cGhlblJlcGxhY2UpO1xuXG4gICAgLy8gbm9ybWFsaXplIHNwYWNlc1xuICAgIHJhbmdlID0gcmFuZ2Uuc3BsaXQoL1xccysvKS5qb2luKFwiIFwiKTtcblxuICAgIC8vIEF0IHRoaXMgcG9pbnQsIHRoZSByYW5nZSBpcyBjb21wbGV0ZWx5IHRyaW1tZWQgYW5kXG4gICAgLy8gcmVhZHkgdG8gYmUgc3BsaXQgaW50byBjb21wYXJhdG9ycy5cblxuICAgIGNvbnN0IHNldDogc3RyaW5nW10gPSByYW5nZVxuICAgICAgLnNwbGl0KFwiIFwiKVxuICAgICAgLm1hcCgoY29tcCkgPT4gcGFyc2VDb21wYXJhdG9yKGNvbXAsIHRoaXMub3B0aW9ucykpXG4gICAgICAuam9pbihcIiBcIilcbiAgICAgIC5zcGxpdCgvXFxzKy8pO1xuXG4gICAgcmV0dXJuIHNldC5tYXAoKGNvbXApID0+IG5ldyBDb21wYXJhdG9yKGNvbXAsIHRoaXMub3B0aW9ucykpO1xuICB9XG5cbiAgdGVzdCh2ZXJzaW9uOiBzdHJpbmcgfCBTZW1WZXIpOiBib29sZWFuIHtcbiAgICBpZiAodHlwZW9mIHZlcnNpb24gPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIHZlcnNpb24gPSBuZXcgU2VtVmVyKHZlcnNpb24sIHRoaXMub3B0aW9ucyk7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnNldC5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHRlc3RTZXQodGhpcy5zZXRbaV0sIHZlcnNpb24sIHRoaXMub3B0aW9ucykpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGludGVyc2VjdHMocmFuZ2U/OiBSYW5nZSwgb3B0aW9ucz86IE9wdGlvbnMpOiBib29sZWFuIHtcbiAgICBpZiAoIShyYW5nZSBpbnN0YW5jZW9mIFJhbmdlKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImEgUmFuZ2UgaXMgcmVxdWlyZWRcIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuc2V0LnNvbWUoKHRoaXNDb21wYXJhdG9ycykgPT4ge1xuICAgICAgcmV0dXJuIChcbiAgICAgICAgaXNTYXRpc2ZpYWJsZSh0aGlzQ29tcGFyYXRvcnMsIG9wdGlvbnMpICYmXG4gICAgICAgIHJhbmdlLnNldC5zb21lKChyYW5nZUNvbXBhcmF0b3JzKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIGlzU2F0aXNmaWFibGUocmFuZ2VDb21wYXJhdG9ycywgb3B0aW9ucykgJiZcbiAgICAgICAgICAgIHRoaXNDb21wYXJhdG9ycy5ldmVyeSgodGhpc0NvbXBhcmF0b3IpID0+IHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJhbmdlQ29tcGFyYXRvcnMuZXZlcnkoKHJhbmdlQ29tcGFyYXRvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzQ29tcGFyYXRvci5pbnRlcnNlY3RzKFxuICAgICAgICAgICAgICAgICAgcmFuZ2VDb21wYXJhdG9yLFxuICAgICAgICAgICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfSk7XG4gIH1cblxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnJhbmdlO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRlc3RTZXQoXG4gIHNldDogUmVhZG9ubHlBcnJheTxDb21wYXJhdG9yPixcbiAgdmVyc2lvbjogU2VtVmVyLFxuICBvcHRpb25zOiBPcHRpb25zLFxuKTogYm9vbGVhbiB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc2V0Lmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKCFzZXRbaV0udGVzdCh2ZXJzaW9uKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGlmICh2ZXJzaW9uLnByZXJlbGVhc2UubGVuZ3RoICYmICFvcHRpb25zLmluY2x1ZGVQcmVyZWxlYXNlKSB7XG4gICAgLy8gRmluZCB0aGUgc2V0IG9mIHZlcnNpb25zIHRoYXQgYXJlIGFsbG93ZWQgdG8gaGF2ZSBwcmVyZWxlYXNlc1xuICAgIC8vIEZvciBleGFtcGxlLCBeMS4yLjMtcHIuMSBkZXN1Z2FycyB0byA+PTEuMi4zLXByLjEgPDIuMC4wXG4gICAgLy8gVGhhdCBzaG91bGQgYWxsb3cgYDEuMi4zLXByLjJgIHRvIHBhc3MuXG4gICAgLy8gSG93ZXZlciwgYDEuMi40LWFscGhhLm5vdHJlYWR5YCBzaG91bGQgTk9UIGJlIGFsbG93ZWQsXG4gICAgLy8gZXZlbiB0aG91Z2ggaXQncyB3aXRoaW4gdGhlIHJhbmdlIHNldCBieSB0aGUgY29tcGFyYXRvcnMuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZXQubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChzZXRbaV0uc2VtdmVyID09PSBBTlkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChzZXRbaV0uc2VtdmVyLnByZXJlbGVhc2UubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCBhbGxvd2VkOiBTZW1WZXIgPSBzZXRbaV0uc2VtdmVyO1xuICAgICAgICBpZiAoXG4gICAgICAgICAgYWxsb3dlZC5tYWpvciA9PT0gdmVyc2lvbi5tYWpvciAmJlxuICAgICAgICAgIGFsbG93ZWQubWlub3IgPT09IHZlcnNpb24ubWlub3IgJiZcbiAgICAgICAgICBhbGxvd2VkLnBhdGNoID09PSB2ZXJzaW9uLnBhdGNoXG4gICAgICAgICkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVmVyc2lvbiBoYXMgYSAtcHJlLCBidXQgaXQncyBub3Qgb25lIG9mIHRoZSBvbmVzIHdlIGxpa2UuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8vIHRha2UgYSBzZXQgb2YgY29tcGFyYXRvcnMgYW5kIGRldGVybWluZSB3aGV0aGVyIHRoZXJlXG4vLyBleGlzdHMgYSB2ZXJzaW9uIHdoaWNoIGNhbiBzYXRpc2Z5IGl0XG5mdW5jdGlvbiBpc1NhdGlzZmlhYmxlKFxuICBjb21wYXJhdG9yczogcmVhZG9ubHkgQ29tcGFyYXRvcltdLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IGJvb2xlYW4ge1xuICBsZXQgcmVzdWx0ID0gdHJ1ZTtcbiAgY29uc3QgcmVtYWluaW5nQ29tcGFyYXRvcnM6IENvbXBhcmF0b3JbXSA9IGNvbXBhcmF0b3JzLnNsaWNlKCk7XG4gIGxldCB0ZXN0Q29tcGFyYXRvciA9IHJlbWFpbmluZ0NvbXBhcmF0b3JzLnBvcCgpO1xuXG4gIHdoaWxlIChyZXN1bHQgJiYgcmVtYWluaW5nQ29tcGFyYXRvcnMubGVuZ3RoKSB7XG4gICAgcmVzdWx0ID0gcmVtYWluaW5nQ29tcGFyYXRvcnMuZXZlcnkoKG90aGVyQ29tcGFyYXRvcikgPT4ge1xuICAgICAgcmV0dXJuIHRlc3RDb21wYXJhdG9yPy5pbnRlcnNlY3RzKG90aGVyQ29tcGFyYXRvciwgb3B0aW9ucyk7XG4gICAgfSk7XG5cbiAgICB0ZXN0Q29tcGFyYXRvciA9IHJlbWFpbmluZ0NvbXBhcmF0b3JzLnBvcCgpO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy8gTW9zdGx5IGp1c3QgZm9yIHRlc3RpbmcgYW5kIGxlZ2FjeSBBUEkgcmVhc29uc1xuZXhwb3J0IGZ1bmN0aW9uIHRvQ29tcGFyYXRvcnMoXG4gIHJhbmdlOiBzdHJpbmcgfCBSYW5nZSxcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiBzdHJpbmdbXVtdIHtcbiAgcmV0dXJuIG5ldyBSYW5nZShyYW5nZSwgb3B0aW9ucykuc2V0Lm1hcCgoY29tcCkgPT4ge1xuICAgIHJldHVybiBjb21wXG4gICAgICAubWFwKChjKSA9PiBjLnZhbHVlKVxuICAgICAgLmpvaW4oXCIgXCIpXG4gICAgICAudHJpbSgpXG4gICAgICAuc3BsaXQoXCIgXCIpO1xuICB9KTtcbn1cblxuLy8gY29tcHJpc2VkIG9mIHhyYW5nZXMsIHRpbGRlcywgc3RhcnMsIGFuZCBndGx0J3MgYXQgdGhpcyBwb2ludC5cbi8vIGFscmVhZHkgcmVwbGFjZWQgdGhlIGh5cGhlbiByYW5nZXNcbi8vIHR1cm4gaW50byBhIHNldCBvZiBKVVNUIGNvbXBhcmF0b3JzLlxuZnVuY3Rpb24gcGFyc2VDb21wYXJhdG9yKGNvbXA6IHN0cmluZywgb3B0aW9uczogT3B0aW9ucyk6IHN0cmluZyB7XG4gIGNvbXAgPSByZXBsYWNlQ2FyZXRzKGNvbXAsIG9wdGlvbnMpO1xuICBjb21wID0gcmVwbGFjZVRpbGRlcyhjb21wLCBvcHRpb25zKTtcbiAgY29tcCA9IHJlcGxhY2VYUmFuZ2VzKGNvbXAsIG9wdGlvbnMpO1xuICBjb21wID0gcmVwbGFjZVN0YXJzKGNvbXAsIG9wdGlvbnMpO1xuICByZXR1cm4gY29tcDtcbn1cblxuZnVuY3Rpb24gaXNYKGlkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuICFpZCB8fCBpZC50b0xvd2VyQ2FzZSgpID09PSBcInhcIiB8fCBpZCA9PT0gXCIqXCI7XG59XG5cbi8vIH4sIH4+IC0tPiAqIChhbnksIGtpbmRhIHNpbGx5KVxuLy8gfjIsIH4yLngsIH4yLngueCwgfj4yLCB+PjIueCB+PjIueC54IC0tPiA+PTIuMC4wIDwzLjAuMFxuLy8gfjIuMCwgfjIuMC54LCB+PjIuMCwgfj4yLjAueCAtLT4gPj0yLjAuMCA8Mi4xLjBcbi8vIH4xLjIsIH4xLjIueCwgfj4xLjIsIH4+MS4yLnggLS0+ID49MS4yLjAgPDEuMy4wXG4vLyB+MS4yLjMsIH4+MS4yLjMgLS0+ID49MS4yLjMgPDEuMy4wXG4vLyB+MS4yLjAsIH4+MS4yLjAgLS0+ID49MS4yLjAgPDEuMy4wXG5mdW5jdGlvbiByZXBsYWNlVGlsZGVzKGNvbXA6IHN0cmluZywgb3B0aW9uczogT3B0aW9ucyk6IHN0cmluZyB7XG4gIHJldHVybiBjb21wXG4gICAgLnRyaW0oKVxuICAgIC5zcGxpdCgvXFxzKy8pXG4gICAgLm1hcCgoY29tcCkgPT4gcmVwbGFjZVRpbGRlKGNvbXAsIG9wdGlvbnMpKVxuICAgIC5qb2luKFwiIFwiKTtcbn1cblxuZnVuY3Rpb24gcmVwbGFjZVRpbGRlKGNvbXA6IHN0cmluZywgX29wdGlvbnM6IE9wdGlvbnMpOiBzdHJpbmcge1xuICBjb25zdCByOiBSZWdFeHAgPSByZVtUSUxERV07XG4gIHJldHVybiBjb21wLnJlcGxhY2UoXG4gICAgcixcbiAgICAoXzogc3RyaW5nLCBNOiBzdHJpbmcsIG06IHN0cmluZywgcDogc3RyaW5nLCBwcjogc3RyaW5nKSA9PiB7XG4gICAgICBsZXQgcmV0OiBzdHJpbmc7XG5cbiAgICAgIGlmIChpc1goTSkpIHtcbiAgICAgICAgcmV0ID0gXCJcIjtcbiAgICAgIH0gZWxzZSBpZiAoaXNYKG0pKSB7XG4gICAgICAgIHJldCA9IFwiPj1cIiArIE0gKyBcIi4wLjAgPFwiICsgKCtNICsgMSkgKyBcIi4wLjBcIjtcbiAgICAgIH0gZWxzZSBpZiAoaXNYKHApKSB7XG4gICAgICAgIC8vIH4xLjIgPT0gPj0xLjIuMCA8MS4zLjBcbiAgICAgICAgcmV0ID0gXCI+PVwiICsgTSArIFwiLlwiICsgbSArIFwiLjAgPFwiICsgTSArIFwiLlwiICsgKCttICsgMSkgKyBcIi4wXCI7XG4gICAgICB9IGVsc2UgaWYgKHByKSB7XG4gICAgICAgIHJldCA9IFwiPj1cIiArXG4gICAgICAgICAgTSArXG4gICAgICAgICAgXCIuXCIgK1xuICAgICAgICAgIG0gK1xuICAgICAgICAgIFwiLlwiICtcbiAgICAgICAgICBwICtcbiAgICAgICAgICBcIi1cIiArXG4gICAgICAgICAgcHIgK1xuICAgICAgICAgIFwiIDxcIiArXG4gICAgICAgICAgTSArXG4gICAgICAgICAgXCIuXCIgK1xuICAgICAgICAgICgrbSArIDEpICtcbiAgICAgICAgICBcIi4wXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB+MS4yLjMgPT0gPj0xLjIuMyA8MS4zLjBcbiAgICAgICAgcmV0ID0gXCI+PVwiICsgTSArIFwiLlwiICsgbSArIFwiLlwiICsgcCArIFwiIDxcIiArIE0gKyBcIi5cIiArICgrbSArIDEpICsgXCIuMFwiO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG4gICk7XG59XG5cbi8vIF4gLS0+ICogKGFueSwga2luZGEgc2lsbHkpXG4vLyBeMiwgXjIueCwgXjIueC54IC0tPiA+PTIuMC4wIDwzLjAuMFxuLy8gXjIuMCwgXjIuMC54IC0tPiA+PTIuMC4wIDwzLjAuMFxuLy8gXjEuMiwgXjEuMi54IC0tPiA+PTEuMi4wIDwyLjAuMFxuLy8gXjEuMi4zIC0tPiA+PTEuMi4zIDwyLjAuMFxuLy8gXjEuMi4wIC0tPiA+PTEuMi4wIDwyLjAuMFxuZnVuY3Rpb24gcmVwbGFjZUNhcmV0cyhjb21wOiBzdHJpbmcsIG9wdGlvbnM6IE9wdGlvbnMpOiBzdHJpbmcge1xuICByZXR1cm4gY29tcFxuICAgIC50cmltKClcbiAgICAuc3BsaXQoL1xccysvKVxuICAgIC5tYXAoKGNvbXApID0+IHJlcGxhY2VDYXJldChjb21wLCBvcHRpb25zKSlcbiAgICAuam9pbihcIiBcIik7XG59XG5cbmZ1bmN0aW9uIHJlcGxhY2VDYXJldChjb21wOiBzdHJpbmcsIF9vcHRpb25zOiBPcHRpb25zKTogc3RyaW5nIHtcbiAgY29uc3QgcjogUmVnRXhwID0gcmVbQ0FSRVRdO1xuICByZXR1cm4gY29tcC5yZXBsYWNlKHIsIChfOiBzdHJpbmcsIE0sIG0sIHAsIHByKSA9PiB7XG4gICAgbGV0IHJldDogc3RyaW5nO1xuXG4gICAgaWYgKGlzWChNKSkge1xuICAgICAgcmV0ID0gXCJcIjtcbiAgICB9IGVsc2UgaWYgKGlzWChtKSkge1xuICAgICAgcmV0ID0gXCI+PVwiICsgTSArIFwiLjAuMCA8XCIgKyAoK00gKyAxKSArIFwiLjAuMFwiO1xuICAgIH0gZWxzZSBpZiAoaXNYKHApKSB7XG4gICAgICBpZiAoTSA9PT0gXCIwXCIpIHtcbiAgICAgICAgcmV0ID0gXCI+PVwiICsgTSArIFwiLlwiICsgbSArIFwiLjAgPFwiICsgTSArIFwiLlwiICsgKCttICsgMSkgKyBcIi4wXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXQgPSBcIj49XCIgKyBNICsgXCIuXCIgKyBtICsgXCIuMCA8XCIgKyAoK00gKyAxKSArIFwiLjAuMFwiO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocHIpIHtcbiAgICAgIGlmIChNID09PSBcIjBcIikge1xuICAgICAgICBpZiAobSA9PT0gXCIwXCIpIHtcbiAgICAgICAgICByZXQgPSBcIj49XCIgK1xuICAgICAgICAgICAgTSArXG4gICAgICAgICAgICBcIi5cIiArXG4gICAgICAgICAgICBtICtcbiAgICAgICAgICAgIFwiLlwiICtcbiAgICAgICAgICAgIHAgK1xuICAgICAgICAgICAgXCItXCIgK1xuICAgICAgICAgICAgcHIgK1xuICAgICAgICAgICAgXCIgPFwiICtcbiAgICAgICAgICAgIE0gK1xuICAgICAgICAgICAgXCIuXCIgK1xuICAgICAgICAgICAgbSArXG4gICAgICAgICAgICBcIi5cIiArXG4gICAgICAgICAgICAoK3AgKyAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXQgPSBcIj49XCIgK1xuICAgICAgICAgICAgTSArXG4gICAgICAgICAgICBcIi5cIiArXG4gICAgICAgICAgICBtICtcbiAgICAgICAgICAgIFwiLlwiICtcbiAgICAgICAgICAgIHAgK1xuICAgICAgICAgICAgXCItXCIgK1xuICAgICAgICAgICAgcHIgK1xuICAgICAgICAgICAgXCIgPFwiICtcbiAgICAgICAgICAgIE0gK1xuICAgICAgICAgICAgXCIuXCIgK1xuICAgICAgICAgICAgKCttICsgMSkgK1xuICAgICAgICAgICAgXCIuMFwiO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXQgPSBcIj49XCIgKyBNICsgXCIuXCIgKyBtICsgXCIuXCIgKyBwICsgXCItXCIgKyBwciArIFwiIDxcIiArICgrTSArIDEpICtcbiAgICAgICAgICBcIi4wLjBcIjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKE0gPT09IFwiMFwiKSB7XG4gICAgICAgIGlmIChtID09PSBcIjBcIikge1xuICAgICAgICAgIHJldCA9IFwiPj1cIiArIE0gKyBcIi5cIiArIG0gKyBcIi5cIiArIHAgKyBcIiA8XCIgKyBNICsgXCIuXCIgKyBtICsgXCIuXCIgK1xuICAgICAgICAgICAgKCtwICsgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0ID0gXCI+PVwiICsgTSArIFwiLlwiICsgbSArIFwiLlwiICsgcCArIFwiIDxcIiArIE0gKyBcIi5cIiArICgrbSArIDEpICsgXCIuMFwiO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXQgPSBcIj49XCIgKyBNICsgXCIuXCIgKyBtICsgXCIuXCIgKyBwICsgXCIgPFwiICsgKCtNICsgMSkgKyBcIi4wLjBcIjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmV0O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcmVwbGFjZVhSYW5nZXMoY29tcDogc3RyaW5nLCBvcHRpb25zOiBPcHRpb25zKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNvbXBcbiAgICAuc3BsaXQoL1xccysvKVxuICAgIC5tYXAoKGNvbXApID0+IHJlcGxhY2VYUmFuZ2UoY29tcCwgb3B0aW9ucykpXG4gICAgLmpvaW4oXCIgXCIpO1xufVxuXG5mdW5jdGlvbiByZXBsYWNlWFJhbmdlKGNvbXA6IHN0cmluZywgX29wdGlvbnM6IE9wdGlvbnMpOiBzdHJpbmcge1xuICBjb21wID0gY29tcC50cmltKCk7XG4gIGNvbnN0IHI6IFJlZ0V4cCA9IHJlW1hSQU5HRV07XG4gIHJldHVybiBjb21wLnJlcGxhY2UociwgKHJldDogc3RyaW5nLCBndGx0LCBNLCBtLCBwLCBfcHIpID0+IHtcbiAgICBjb25zdCB4TTogYm9vbGVhbiA9IGlzWChNKTtcbiAgICBjb25zdCB4bTogYm9vbGVhbiA9IHhNIHx8IGlzWChtKTtcbiAgICBjb25zdCB4cDogYm9vbGVhbiA9IHhtIHx8IGlzWChwKTtcbiAgICBjb25zdCBhbnlYOiBib29sZWFuID0geHA7XG5cbiAgICBpZiAoZ3RsdCA9PT0gXCI9XCIgJiYgYW55WCkge1xuICAgICAgZ3RsdCA9IFwiXCI7XG4gICAgfVxuXG4gICAgaWYgKHhNKSB7XG4gICAgICBpZiAoZ3RsdCA9PT0gXCI+XCIgfHwgZ3RsdCA9PT0gXCI8XCIpIHtcbiAgICAgICAgLy8gbm90aGluZyBpcyBhbGxvd2VkXG4gICAgICAgIHJldCA9IFwiPDAuMC4wXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBub3RoaW5nIGlzIGZvcmJpZGRlblxuICAgICAgICByZXQgPSBcIipcIjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGd0bHQgJiYgYW55WCkge1xuICAgICAgLy8gd2Uga25vdyBwYXRjaCBpcyBhbiB4LCBiZWNhdXNlIHdlIGhhdmUgYW55IHggYXQgYWxsLlxuICAgICAgLy8gcmVwbGFjZSBYIHdpdGggMFxuICAgICAgaWYgKHhtKSB7XG4gICAgICAgIG0gPSAwO1xuICAgICAgfVxuICAgICAgcCA9IDA7XG5cbiAgICAgIGlmIChndGx0ID09PSBcIj5cIikge1xuICAgICAgICAvLyA+MSA9PiA+PTIuMC4wXG4gICAgICAgIC8vID4xLjIgPT4gPj0xLjMuMFxuICAgICAgICAvLyA+MS4yLjMgPT4gPj0gMS4yLjRcbiAgICAgICAgZ3RsdCA9IFwiPj1cIjtcbiAgICAgICAgaWYgKHhtKSB7XG4gICAgICAgICAgTSA9ICtNICsgMTtcbiAgICAgICAgICBtID0gMDtcbiAgICAgICAgICBwID0gMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtID0gK20gKyAxO1xuICAgICAgICAgIHAgPSAwO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGd0bHQgPT09IFwiPD1cIikge1xuICAgICAgICAvLyA8PTAuNy54IGlzIGFjdHVhbGx5IDwwLjguMCwgc2luY2UgYW55IDAuNy54IHNob3VsZFxuICAgICAgICAvLyBwYXNzLiAgU2ltaWxhcmx5LCA8PTcueCBpcyBhY3R1YWxseSA8OC4wLjAsIGV0Yy5cbiAgICAgICAgZ3RsdCA9IFwiPFwiO1xuICAgICAgICBpZiAoeG0pIHtcbiAgICAgICAgICBNID0gK00gKyAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG0gPSArbSArIDE7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0ID0gZ3RsdCArIE0gKyBcIi5cIiArIG0gKyBcIi5cIiArIHA7XG4gICAgfSBlbHNlIGlmICh4bSkge1xuICAgICAgcmV0ID0gXCI+PVwiICsgTSArIFwiLjAuMCA8XCIgKyAoK00gKyAxKSArIFwiLjAuMFwiO1xuICAgIH0gZWxzZSBpZiAoeHApIHtcbiAgICAgIHJldCA9IFwiPj1cIiArIE0gKyBcIi5cIiArIG0gKyBcIi4wIDxcIiArIE0gKyBcIi5cIiArICgrbSArIDEpICsgXCIuMFwiO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH0pO1xufVxuXG4vLyBCZWNhdXNlICogaXMgQU5ELWVkIHdpdGggZXZlcnl0aGluZyBlbHNlIGluIHRoZSBjb21wYXJhdG9yLFxuLy8gYW5kICcnIG1lYW5zIFwiYW55IHZlcnNpb25cIiwganVzdCByZW1vdmUgdGhlICpzIGVudGlyZWx5LlxuZnVuY3Rpb24gcmVwbGFjZVN0YXJzKGNvbXA6IHN0cmluZywgX29wdGlvbnM6IE9wdGlvbnMpOiBzdHJpbmcge1xuICByZXR1cm4gY29tcC50cmltKCkucmVwbGFjZShyZVtTVEFSXSwgXCJcIik7XG59XG5cbi8vIFRoaXMgZnVuY3Rpb24gaXMgcGFzc2VkIHRvIHN0cmluZy5yZXBsYWNlKHJlW0hZUEhFTlJBTkdFXSlcbi8vIE0sIG0sIHBhdGNoLCBwcmVyZWxlYXNlLCBidWlsZFxuLy8gMS4yIC0gMy40LjUgPT4gPj0xLjIuMCA8PTMuNC41XG4vLyAxLjIuMyAtIDMuNCA9PiA+PTEuMi4wIDwzLjUuMCBBbnkgMy40Lnggd2lsbCBkb1xuLy8gMS4yIC0gMy40ID0+ID49MS4yLjAgPDMuNS4wXG5mdW5jdGlvbiBoeXBoZW5SZXBsYWNlKFxuICBfJDA6IHN0cmluZyxcbiAgZnJvbTogc3RyaW5nLFxuICBmTTogc3RyaW5nLFxuICBmbTogc3RyaW5nLFxuICBmcDogc3RyaW5nLFxuICBfZnByOiBzdHJpbmcsXG4gIF9mYjogc3RyaW5nLFxuICB0bzogc3RyaW5nLFxuICB0TTogc3RyaW5nLFxuICB0bTogc3RyaW5nLFxuICB0cDogc3RyaW5nLFxuICB0cHI6IHN0cmluZyxcbiAgX3RiOiBzdHJpbmcsXG4pIHtcbiAgaWYgKGlzWChmTSkpIHtcbiAgICBmcm9tID0gXCJcIjtcbiAgfSBlbHNlIGlmIChpc1goZm0pKSB7XG4gICAgZnJvbSA9IFwiPj1cIiArIGZNICsgXCIuMC4wXCI7XG4gIH0gZWxzZSBpZiAoaXNYKGZwKSkge1xuICAgIGZyb20gPSBcIj49XCIgKyBmTSArIFwiLlwiICsgZm0gKyBcIi4wXCI7XG4gIH0gZWxzZSB7XG4gICAgZnJvbSA9IFwiPj1cIiArIGZyb207XG4gIH1cblxuICBpZiAoaXNYKHRNKSkge1xuICAgIHRvID0gXCJcIjtcbiAgfSBlbHNlIGlmIChpc1godG0pKSB7XG4gICAgdG8gPSBcIjxcIiArICgrdE0gKyAxKSArIFwiLjAuMFwiO1xuICB9IGVsc2UgaWYgKGlzWCh0cCkpIHtcbiAgICB0byA9IFwiPFwiICsgdE0gKyBcIi5cIiArICgrdG0gKyAxKSArIFwiLjBcIjtcbiAgfSBlbHNlIGlmICh0cHIpIHtcbiAgICB0byA9IFwiPD1cIiArIHRNICsgXCIuXCIgKyB0bSArIFwiLlwiICsgdHAgKyBcIi1cIiArIHRwcjtcbiAgfSBlbHNlIHtcbiAgICB0byA9IFwiPD1cIiArIHRvO1xuICB9XG5cbiAgcmV0dXJuIChmcm9tICsgXCIgXCIgKyB0bykudHJpbSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2F0aXNmaWVzKFxuICB2ZXJzaW9uOiBzdHJpbmcgfCBTZW1WZXIsXG4gIHJhbmdlOiBzdHJpbmcgfCBSYW5nZSxcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiBib29sZWFuIHtcbiAgdHJ5IHtcbiAgICByYW5nZSA9IG5ldyBSYW5nZShyYW5nZSwgb3B0aW9ucyk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gcmFuZ2UudGVzdCh2ZXJzaW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1heFNhdGlzZnlpbmc8VCBleHRlbmRzIHN0cmluZyB8IFNlbVZlcj4oXG4gIHZlcnNpb25zOiBSZWFkb25seUFycmF5PFQ+LFxuICByYW5nZTogc3RyaW5nIHwgUmFuZ2UsXG4gIG9wdGlvbnM/OiBPcHRpb25zLFxuKTogVCB8IG51bGwge1xuICAvL3RvZG9cbiAgbGV0IG1heDogVCB8IFNlbVZlciB8IG51bGwgPSBudWxsO1xuICBsZXQgbWF4U1Y6IFNlbVZlciB8IG51bGwgPSBudWxsO1xuICBsZXQgcmFuZ2VPYmo6IFJhbmdlO1xuICB0cnkge1xuICAgIHJhbmdlT2JqID0gbmV3IFJhbmdlKHJhbmdlLCBvcHRpb25zKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgdmVyc2lvbnMuZm9yRWFjaCgodikgPT4ge1xuICAgIGlmIChyYW5nZU9iai50ZXN0KHYpKSB7XG4gICAgICAvLyBzYXRpc2ZpZXModiwgcmFuZ2UsIG9wdGlvbnMpXG4gICAgICBpZiAoIW1heCB8fCAobWF4U1YgJiYgbWF4U1YuY29tcGFyZSh2KSA9PT0gLTEpKSB7XG4gICAgICAgIC8vIGNvbXBhcmUobWF4LCB2LCB0cnVlKVxuICAgICAgICBtYXggPSB2O1xuICAgICAgICBtYXhTViA9IG5ldyBTZW1WZXIobWF4LCBvcHRpb25zKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICByZXR1cm4gbWF4O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWluU2F0aXNmeWluZzxUIGV4dGVuZHMgc3RyaW5nIHwgU2VtVmVyPihcbiAgdmVyc2lvbnM6IFJlYWRvbmx5QXJyYXk8VD4sXG4gIHJhbmdlOiBzdHJpbmcgfCBSYW5nZSxcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiBUIHwgbnVsbCB7XG4gIC8vdG9kb1xuICBsZXQgbWluOiBzdHJpbmcgfCBTZW1WZXIgfCBudWxsID0gbnVsbDtcbiAgbGV0IG1pblNWOiBTZW1WZXIgfCBudWxsID0gbnVsbDtcbiAgbGV0IHJhbmdlT2JqOiBSYW5nZTtcbiAgdHJ5IHtcbiAgICByYW5nZU9iaiA9IG5ldyBSYW5nZShyYW5nZSwgb3B0aW9ucyk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHZlcnNpb25zLmZvckVhY2goKHYpID0+IHtcbiAgICBpZiAocmFuZ2VPYmoudGVzdCh2KSkge1xuICAgICAgLy8gc2F0aXNmaWVzKHYsIHJhbmdlLCBvcHRpb25zKVxuICAgICAgaWYgKCFtaW4gfHwgbWluU1YhLmNvbXBhcmUodikgPT09IDEpIHtcbiAgICAgICAgLy8gY29tcGFyZShtaW4sIHYsIHRydWUpXG4gICAgICAgIG1pbiA9IHY7XG4gICAgICAgIG1pblNWID0gbmV3IFNlbVZlcihtaW4sIG9wdGlvbnMpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gIHJldHVybiBtaW47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtaW5WZXJzaW9uKFxuICByYW5nZTogc3RyaW5nIHwgUmFuZ2UsXG4gIG9wdGlvbnM/OiBPcHRpb25zLFxuKTogU2VtVmVyIHwgbnVsbCB7XG4gIHJhbmdlID0gbmV3IFJhbmdlKHJhbmdlLCBvcHRpb25zKTtcblxuICBsZXQgbWludmVyOiBTZW1WZXIgfCBudWxsID0gbmV3IFNlbVZlcihcIjAuMC4wXCIpO1xuICBpZiAocmFuZ2UudGVzdChtaW52ZXIpKSB7XG4gICAgcmV0dXJuIG1pbnZlcjtcbiAgfVxuXG4gIG1pbnZlciA9IG5ldyBTZW1WZXIoXCIwLjAuMC0wXCIpO1xuICBpZiAocmFuZ2UudGVzdChtaW52ZXIpKSB7XG4gICAgcmV0dXJuIG1pbnZlcjtcbiAgfVxuXG4gIG1pbnZlciA9IG51bGw7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcmFuZ2Uuc2V0Lmxlbmd0aDsgKytpKSB7XG4gICAgY29uc3QgY29tcGFyYXRvcnMgPSByYW5nZS5zZXRbaV07XG5cbiAgICBjb21wYXJhdG9ycy5mb3JFYWNoKChjb21wYXJhdG9yKSA9PiB7XG4gICAgICAvLyBDbG9uZSB0byBhdm9pZCBtYW5pcHVsYXRpbmcgdGhlIGNvbXBhcmF0b3IncyBzZW12ZXIgb2JqZWN0LlxuICAgICAgY29uc3QgY29tcHZlciA9IG5ldyBTZW1WZXIoY29tcGFyYXRvci5zZW12ZXIudmVyc2lvbik7XG4gICAgICBzd2l0Y2ggKGNvbXBhcmF0b3Iub3BlcmF0b3IpIHtcbiAgICAgICAgY2FzZSBcIj5cIjpcbiAgICAgICAgICBpZiAoY29tcHZlci5wcmVyZWxlYXNlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29tcHZlci5wYXRjaCsrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb21wdmVyLnByZXJlbGVhc2UucHVzaCgwKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29tcHZlci5yYXcgPSBjb21wdmVyLmZvcm1hdCgpO1xuICAgICAgICAvKiBmYWxsdGhyb3VnaCAqL1xuICAgICAgICBjYXNlIFwiXCI6XG4gICAgICAgIGNhc2UgXCI+PVwiOlxuICAgICAgICAgIGlmICghbWludmVyIHx8IGd0KG1pbnZlciwgY29tcHZlcikpIHtcbiAgICAgICAgICAgIG1pbnZlciA9IGNvbXB2ZXI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwiPFwiOlxuICAgICAgICBjYXNlIFwiPD1cIjpcbiAgICAgICAgICAvKiBJZ25vcmUgbWF4aW11bSB2ZXJzaW9ucyAqL1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuZXhwZWN0ZWQgb3BlcmF0aW9uOiBcIiArIGNvbXBhcmF0b3Iub3BlcmF0b3IpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgaWYgKG1pbnZlciAmJiByYW5nZS50ZXN0KG1pbnZlcikpIHtcbiAgICByZXR1cm4gbWludmVyO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZFJhbmdlKFxuICByYW5nZTogc3RyaW5nIHwgUmFuZ2UgfCBudWxsLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IHN0cmluZyB8IG51bGwge1xuICB0cnkge1xuICAgIGlmIChyYW5nZSA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XG4gICAgLy8gUmV0dXJuICcqJyBpbnN0ZWFkIG9mICcnIHNvIHRoYXQgdHJ1dGhpbmVzcyB3b3Jrcy5cbiAgICAvLyBUaGlzIHdpbGwgdGhyb3cgaWYgaXQncyBpbnZhbGlkIGFueXdheVxuICAgIHJldHVybiBuZXcgUmFuZ2UocmFuZ2UsIG9wdGlvbnMpLnJhbmdlIHx8IFwiKlwiO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybiB0cnVlIGlmIHZlcnNpb24gaXMgbGVzcyB0aGFuIGFsbCB0aGUgdmVyc2lvbnMgcG9zc2libGUgaW4gdGhlIHJhbmdlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbHRyKFxuICB2ZXJzaW9uOiBzdHJpbmcgfCBTZW1WZXIsXG4gIHJhbmdlOiBzdHJpbmcgfCBSYW5nZSxcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiBib29sZWFuIHtcbiAgcmV0dXJuIG91dHNpZGUodmVyc2lvbiwgcmFuZ2UsIFwiPFwiLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBSZXR1cm4gdHJ1ZSBpZiB2ZXJzaW9uIGlzIGdyZWF0ZXIgdGhhbiBhbGwgdGhlIHZlcnNpb25zIHBvc3NpYmxlIGluIHRoZSByYW5nZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGd0cihcbiAgdmVyc2lvbjogc3RyaW5nIHwgU2VtVmVyLFxuICByYW5nZTogc3RyaW5nIHwgUmFuZ2UsXG4gIG9wdGlvbnM/OiBPcHRpb25zLFxuKTogYm9vbGVhbiB7XG4gIHJldHVybiBvdXRzaWRlKHZlcnNpb24sIHJhbmdlLCBcIj5cIiwgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogUmV0dXJuIHRydWUgaWYgdGhlIHZlcnNpb24gaXMgb3V0c2lkZSB0aGUgYm91bmRzIG9mIHRoZSByYW5nZSBpbiBlaXRoZXIgdGhlIGhpZ2ggb3IgbG93IGRpcmVjdGlvbi5cbiAqIFRoZSBoaWxvIGFyZ3VtZW50IG11c3QgYmUgZWl0aGVyIHRoZSBzdHJpbmcgJz4nIG9yICc8Jy4gKFRoaXMgaXMgdGhlIGZ1bmN0aW9uIGNhbGxlZCBieSBndHIgYW5kIGx0ci4pXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvdXRzaWRlKFxuICB2ZXJzaW9uOiBzdHJpbmcgfCBTZW1WZXIsXG4gIHJhbmdlOiBzdHJpbmcgfCBSYW5nZSxcbiAgaGlsbzogXCI+XCIgfCBcIjxcIixcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiBib29sZWFuIHtcbiAgdmVyc2lvbiA9IG5ldyBTZW1WZXIodmVyc2lvbiwgb3B0aW9ucyk7XG4gIHJhbmdlID0gbmV3IFJhbmdlKHJhbmdlLCBvcHRpb25zKTtcblxuICBsZXQgZ3RmbjogdHlwZW9mIGd0O1xuICBsZXQgbHRlZm46IHR5cGVvZiBsdGU7XG4gIGxldCBsdGZuOiB0eXBlb2YgbHQ7XG4gIGxldCBjb21wOiBzdHJpbmc7XG4gIGxldCBlY29tcDogc3RyaW5nO1xuICBzd2l0Y2ggKGhpbG8pIHtcbiAgICBjYXNlIFwiPlwiOlxuICAgICAgZ3RmbiA9IGd0O1xuICAgICAgbHRlZm4gPSBsdGU7XG4gICAgICBsdGZuID0gbHQ7XG4gICAgICBjb21wID0gXCI+XCI7XG4gICAgICBlY29tcCA9IFwiPj1cIjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgXCI8XCI6XG4gICAgICBndGZuID0gbHQ7XG4gICAgICBsdGVmbiA9IGd0ZTtcbiAgICAgIGx0Zm4gPSBndDtcbiAgICAgIGNvbXAgPSBcIjxcIjtcbiAgICAgIGVjb21wID0gXCI8PVwiO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ011c3QgcHJvdmlkZSBhIGhpbG8gdmFsIG9mIFwiPFwiIG9yIFwiPlwiJyk7XG4gIH1cblxuICAvLyBJZiBpdCBzYXRpc2lmZXMgdGhlIHJhbmdlIGl0IGlzIG5vdCBvdXRzaWRlXG4gIGlmIChzYXRpc2ZpZXModmVyc2lvbiwgcmFuZ2UsIG9wdGlvbnMpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gRnJvbSBub3cgb24sIHZhcmlhYmxlIHRlcm1zIGFyZSBhcyBpZiB3ZSdyZSBpbiBcImd0clwiIG1vZGUuXG4gIC8vIGJ1dCBub3RlIHRoYXQgZXZlcnl0aGluZyBpcyBmbGlwcGVkIGZvciB0aGUgXCJsdHJcIiBmdW5jdGlvbi5cblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHJhbmdlLnNldC5sZW5ndGg7ICsraSkge1xuICAgIGNvbnN0IGNvbXBhcmF0b3JzOiByZWFkb25seSBDb21wYXJhdG9yW10gPSByYW5nZS5zZXRbaV07XG5cbiAgICBsZXQgaGlnaDogQ29tcGFyYXRvciB8IG51bGwgPSBudWxsO1xuICAgIGxldCBsb3c6IENvbXBhcmF0b3IgfCBudWxsID0gbnVsbDtcblxuICAgIGZvciAobGV0IGNvbXBhcmF0b3Igb2YgY29tcGFyYXRvcnMpIHtcbiAgICAgIGlmIChjb21wYXJhdG9yLnNlbXZlciA9PT0gQU5ZKSB7XG4gICAgICAgIGNvbXBhcmF0b3IgPSBuZXcgQ29tcGFyYXRvcihcIj49MC4wLjBcIik7XG4gICAgICB9XG4gICAgICBoaWdoID0gaGlnaCB8fCBjb21wYXJhdG9yO1xuICAgICAgbG93ID0gbG93IHx8IGNvbXBhcmF0b3I7XG4gICAgICBpZiAoZ3Rmbihjb21wYXJhdG9yLnNlbXZlciwgaGlnaC5zZW12ZXIsIG9wdGlvbnMpKSB7XG4gICAgICAgIGhpZ2ggPSBjb21wYXJhdG9yO1xuICAgICAgfSBlbHNlIGlmIChsdGZuKGNvbXBhcmF0b3Iuc2VtdmVyLCBsb3cuc2VtdmVyLCBvcHRpb25zKSkge1xuICAgICAgICBsb3cgPSBjb21wYXJhdG9yO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChoaWdoID09PSBudWxsIHx8IGxvdyA9PT0gbnVsbCkgcmV0dXJuIHRydWU7XG5cbiAgICAvLyBJZiB0aGUgZWRnZSB2ZXJzaW9uIGNvbXBhcmF0b3IgaGFzIGEgb3BlcmF0b3IgdGhlbiBvdXIgdmVyc2lvblxuICAgIC8vIGlzbid0IG91dHNpZGUgaXRcbiAgICBpZiAoaGlnaCEub3BlcmF0b3IgPT09IGNvbXAgfHwgaGlnaCEub3BlcmF0b3IgPT09IGVjb21wKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlIGxvd2VzdCB2ZXJzaW9uIGNvbXBhcmF0b3IgaGFzIGFuIG9wZXJhdG9yIGFuZCBvdXIgdmVyc2lvblxuICAgIC8vIGlzIGxlc3MgdGhhbiBpdCB0aGVuIGl0IGlzbid0IGhpZ2hlciB0aGFuIHRoZSByYW5nZVxuICAgIGlmIChcbiAgICAgICghbG93IS5vcGVyYXRvciB8fCBsb3chLm9wZXJhdG9yID09PSBjb21wKSAmJlxuICAgICAgbHRlZm4odmVyc2lvbiwgbG93IS5zZW12ZXIpXG4gICAgKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIGlmIChsb3chLm9wZXJhdG9yID09PSBlY29tcCAmJiBsdGZuKHZlcnNpb24sIGxvdyEuc2VtdmVyKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByZXJlbGVhc2UoXG4gIHZlcnNpb246IHN0cmluZyB8IFNlbVZlcixcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiBSZWFkb25seUFycmF5PHN0cmluZyB8IG51bWJlcj4gfCBudWxsIHtcbiAgY29uc3QgcGFyc2VkID0gcGFyc2UodmVyc2lvbiwgb3B0aW9ucyk7XG4gIHJldHVybiBwYXJzZWQgJiYgcGFyc2VkLnByZXJlbGVhc2UubGVuZ3RoID8gcGFyc2VkLnByZXJlbGVhc2UgOiBudWxsO1xufVxuXG4vKipcbiAqIFJldHVybiB0cnVlIGlmIGFueSBvZiB0aGUgcmFuZ2VzIGNvbXBhcmF0b3JzIGludGVyc2VjdFxuICovXG5leHBvcnQgZnVuY3Rpb24gaW50ZXJzZWN0cyhcbiAgcmFuZ2UxOiBzdHJpbmcgfCBSYW5nZSB8IENvbXBhcmF0b3IsXG4gIHJhbmdlMjogc3RyaW5nIHwgUmFuZ2UgfCBDb21wYXJhdG9yLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IGJvb2xlYW4ge1xuICByYW5nZTEgPSBuZXcgUmFuZ2UocmFuZ2UxLCBvcHRpb25zKTtcbiAgcmFuZ2UyID0gbmV3IFJhbmdlKHJhbmdlMiwgb3B0aW9ucyk7XG4gIHJldHVybiByYW5nZTEuaW50ZXJzZWN0cyhyYW5nZTIpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBTZW1WZXI7XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBcUNBLHNFQUFzRTtBQUN0RSxvREFBb0Q7QUFDcEQsT0FBTyxNQUFNLG1CQUFtQixHQUFHLE9BQU8sQ0FBQztBQUUzQyxNQUFNLFVBQVUsR0FBRyxHQUFHLEFBQUM7QUFFdkIscUJBQXFCO0FBQ3JCLE1BQU0sRUFBRSxHQUFhLEVBQUUsQUFBQztBQUN4QixNQUFNLEdBQUcsR0FBYSxFQUFFLEFBQUM7QUFDekIsSUFBSSxDQUFDLEdBQUcsQ0FB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LEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUNyQixHQUFHLEdBQ0gsU0FBUyxHQUNULEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUNyQixHQUFHLEdBQ0gsS0FBSyxHQUNMLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FDZixJQUFJLEdBQ0osR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUNWLEdBQUcsR0FDSCxNQUFNLENBQUM7QUFFVCxNQUFNLE1BQU0sR0FBVyxDQUFDLEVBQUUsQUFBQztBQUMzQixHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztBQUVoRSxnQkFBZ0I7QUFDaEIsNkNBQTZDO0FBQzdDLE1BQU0sU0FBUyxHQUFXLENBQUMsRUFBRSxBQUFDO0FBQzlCLEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxTQUFTLENBQUM7QUFFM0IsTUFBTSxLQUFLLEdBQVcsQ0FBQyxFQUFFLEFBQUM7QUFDMUIsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztBQUUzRCxnQkFBZ0I7QUFDaEIsc0RBQXNEO0FBQ3RELE1BQU0sU0FBUyxHQUFXLENBQUMsRUFBRSxBQUFDO0FBQzlCLEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxTQUFTLENBQUM7QUFFM0IsTUFBTSxLQUFLLEdBQVcsQ0FBQyxFQUFFLEFBQUM7QUFDMUIsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztBQUUzRCxnRUFBZ0U7QUFDaEUsTUFBTSxVQUFVLEdBQVcsQ0FBQyxFQUFFLEFBQUM7QUFDL0IsR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENB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RSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7Q0FDckM7QUFFRCxPQUFPLFNBQVMsRUFBRSxDQUNoQixFQUFtQixFQUNuQixFQUFtQixFQUNuQixPQUFpQixFQUNSO0lBQ1QsT0FBTyxPQUFPLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7Q0FDckM7QUFFRCxPQUFPLFNBQVMsRUFBRSxDQUNoQixFQUFtQixFQUNuQixFQUFtQixFQUNuQixPQUFpQixFQUNSO0lBQ1QsT0FBTyxPQUFPLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7Q0FDdkM7QUFFRCxPQUFPLFNBQVMsR0FBRyxDQUNqQixFQUFtQixFQUNuQixFQUFtQixFQUNuQixPQUFpQixFQUNSO0lBQ1QsT0FBTyxPQUFPLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7Q0FDdkM7QUFFRCxPQUFPLFNBQVMsR0FBRyxDQUNqQixFQUFtQixFQUNuQixFQUFtQixFQUNuQixPQUFpQixFQUNSO0lBQ1QsT0FBTyxPQUFPLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Q0FDdEM7QUFFRCxPQUFPLFNBQVMsR0FBRyxDQUNqQixFQUFtQixFQUNuQixFQUFtQixFQUNuQixPQUFpQixFQUNSO0lBQ1QsT0FBTyxPQUFPLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Q0FDdEM7QUFFRCxPQUFPLFNBQVMsR0FBRyxDQUNqQixFQUFtQixFQUNuQixRQUFrQixFQUNsQixFQUFtQixFQUNuQixPQUFpQixFQUNSO0lBQ1QsT0FBUSxRQUFRO1FBQ2QsS0FBSyxLQUFLO1lBQ1IsSUFBSSxPQUFPLEVBQUUsS0FBSyxRQUFRLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUM7WUFDNUMsSUFBSSxPQUFPLEVBQUUsS0FBSyxRQUFRLEVBQUUsRUFB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