export class Client {
    /**
   * Initiates Class.
   * @param {String} key Custom database URL
   */ key;
    constructor(key){
        if (key) this.key = key;
        else this.key = Deno.env.get('REPLIT_DB_URL');
    }
    // Native Functions
    /**
   * Gets a key
   * @param {String} key Key
   * @param {boolean} [options.raw=false] Makes it so that we return the raw string value. Default is false.
   */ async get(key, options) {
        return await fetch(this.key + "/" + key).then((e)=>e.text()).then((strValue)=>{
            if (options && options.raw) {
                return strValue;
            }
            if (!strValue) {
                return null;
            }
            let value = strValue;
            try {
                // Try to parse as JSON, if it fails, we throw
                value = JSON.parse(strValue);
            } catch (_err) {
                throw new SyntaxError(`Failed to parse value of ${key}, try passing a raw option to get the raw value`);
            }
            if (value === null || value === undefined) {
                return null;
            }
            return value;
        });
    }
    /**
   * Sets a key
   * @param {String} key Key
   * @param {any} value Value
   */ async set(key, value) {
        const strValue = JSON.stringify(value);
        await fetch(this.key, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: key + "=" + strValue
        });
        return this;
    }
    /**
   * Deletes a key
   * @param {String} key Key
   */ async delete(key) {
        await fetch(this.key + "/" + key, {
            method: "DELETE"
        });
        return this;
    }
    /**
   * List key starting with a prefix or list all.
   * @param {String} prefix Filter keys starting with prefix.
   */ async list(prefix = "") {
        return await fetch(this.key + `?encode=true&prefix=${encodeURIComponent(prefix)}`).then((r)=>r.text()).then((t)=>{
            if (t.length === 0) {
                return [];
            }
            return t.split("\n").map(decodeURIComponent);
        });
    }
    // Dynamic Functions
    /**
   * Clears the database.
   */ async empty() {
        const promises = [];
        for (const key of (await this.list())){
            promises.push(this.delete(key));
        }
        await Promise.all(promises);
        return this;
    }
    /**
   * Get all key/value pairs and return as an object
   */ async getAll() {
        let output = {};
        for (const key of (await this.list())){
            let value = await this.get(key);
            output[key] = value;
        }
        return output;
    }
    /**
   * Sets the entire database through an object.
   * @param {Object} obj The object.
   */ async setAll(obj) {
        for(const key in obj){
            let val = obj[key];
            await this.set(key, val);
        }
        return this;
    }
    /**
   * Delete multiple entries by keys
   * @param {Array<string>} args Keys
   */ async deleteMultiple(...args) {
        const promises = [];
        for (const arg of args){
            promises.push(this.delete(arg));
        }
        await Promise.all(promises);
        return this;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvcmVwbGl0X2RhdGFiYXNlQHYxLjEvbW9kLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjbGFzcyBDbGllbnQge1xuICAvKipcbiAgICogSW5pdGlhdGVzIENsYXNzLlxuICAgKiBAcGFyYW0ge1N0cmluZ30ga2V5IEN1c3RvbSBkYXRhYmFzZSBVUkxcbiAgICovXG4gIGtleTogc3RyaW5nO1xuICBjb25zdHJ1Y3RvcihrZXk/OiBzdHJpbmcpIHtcbiAgICBpZiAoa2V5KSB0aGlzLmtleSA9IGtleTtcbiAgICBlbHNlIHRoaXMua2V5ID0gRGVuby5lbnYuZ2V0KCdSRVBMSVRfREJfVVJMJykgYXMgc3RyaW5nO1xuICB9XG5cbiAgLy8gTmF0aXZlIEZ1bmN0aW9uc1xuICAvKipcbiAgICogR2V0cyBhIGtleVxuICAgKiBAcGFyYW0ge1N0cmluZ30ga2V5IEtleVxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnJhdz1mYWxzZV0gTWFrZXMgaXQgc28gdGhhdCB3ZSByZXR1cm4gdGhlIHJhdyBzdHJpbmcgdmFsdWUuIERlZmF1bHQgaXMgZmFsc2UuXG4gICAqL1xuICBhc3luYyBnZXQoa2V5OiBzdHJpbmcsIG9wdGlvbnM/OiB7IHJhdzogYm9vbGVhbiB9KTogUHJvbWlzZTxhbnk+IHtcbiAgICByZXR1cm4gYXdhaXQgZmV0Y2godGhpcy5rZXkgKyBcIi9cIiArIGtleSlcbiAgICAgIC50aGVuKChlKSA9PiBlLnRleHQoKSlcbiAgICAgIC50aGVuKChzdHJWYWx1ZSkgPT4ge1xuICAgICAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLnJhdykge1xuICAgICAgICAgIHJldHVybiBzdHJWYWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghc3RyVmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB2YWx1ZSA9IHN0clZhbHVlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIFRyeSB0byBwYXJzZSBhcyBKU09OLCBpZiBpdCBmYWlscywgd2UgdGhyb3dcbiAgICAgICAgICB2YWx1ZSA9IEpTT04ucGFyc2Uoc3RyVmFsdWUpO1xuICAgICAgICB9IGNhdGNoIChfZXJyKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFxuICAgICAgICAgICAgYEZhaWxlZCB0byBwYXJzZSB2YWx1ZSBvZiAke2tleX0sIHRyeSBwYXNzaW5nIGEgcmF3IG9wdGlvbiB0byBnZXQgdGhlIHJhdyB2YWx1ZWBcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgYSBrZXlcbiAgICogQHBhcmFtIHtTdHJpbmd9IGtleSBLZXlcbiAgICogQHBhcmFtIHthbnl9IHZhbHVlIFZhbHVlXG4gICAqL1xuICBhc3luYyBzZXQ8VD4oa2V5OiBzdHJpbmcsIHZhbHVlOiBUKSB7XG4gICAgY29uc3Qgc3RyVmFsdWUgPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XG5cbiAgICBhd2FpdCBmZXRjaCh0aGlzLmtleSwge1xuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGhlYWRlcnM6IHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWRcIiB9LFxuICAgICAgYm9keToga2V5ICsgXCI9XCIgKyBzdHJWYWx1ZSxcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxldGVzIGEga2V5XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgS2V5XG4gICAqL1xuICBhc3luYyBkZWxldGUoa2V5OiBzdHJpbmcpIHtcbiAgICBhd2FpdCBmZXRjaCh0aGlzLmtleSArIFwiL1wiICsga2V5LCB7IG1ldGhvZDogXCJERUxFVEVcIiB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBMaXN0IGtleSBzdGFydGluZyB3aXRoIGEgcHJlZml4IG9yIGxpc3QgYWxsLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcHJlZml4IEZpbHRlciBrZXlzIHN0YXJ0aW5nIHdpdGggcHJlZml4LlxuICAgKi9cbiAgYXN5bmMgbGlzdChwcmVmaXggPSBcIlwiKSB7XG4gICAgcmV0dXJuIGF3YWl0IGZldGNoKFxuICAgICAgdGhpcy5rZXkgKyBgP2VuY29kZT10cnVlJnByZWZpeD0ke2VuY29kZVVSSUNvbXBvbmVudChwcmVmaXgpfWBcbiAgICApXG4gICAgICAudGhlbigocikgPT4gci50ZXh0KCkpXG4gICAgICAudGhlbigodCkgPT4ge1xuICAgICAgICBpZiAodC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHQuc3BsaXQoXCJcXG5cIikubWFwKGRlY29kZVVSSUNvbXBvbmVudCk7XG4gICAgICB9KTtcbiAgfVxuXG4gIC8vIER5bmFtaWMgRnVuY3Rpb25zXG4gIC8qKlxuICAgKiBDbGVhcnMgdGhlIGRhdGFiYXNlLlxuICAgKi9cbiAgYXN5bmMgZW1wdHkoKSB7XG4gICAgY29uc3QgcHJvbWlzZXMgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBhd2FpdCB0aGlzLmxpc3QoKSkge1xuICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLmRlbGV0ZShrZXkpKTtcbiAgICB9XG5cbiAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIGtleS92YWx1ZSBwYWlycyBhbmQgcmV0dXJuIGFzIGFuIG9iamVjdFxuICAgKi9cbiAgYXN5bmMgZ2V0QWxsKCkge1xuICAgIGxldCBvdXRwdXQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge307XG4gICAgZm9yIChjb25zdCBrZXkgb2YgYXdhaXQgdGhpcy5saXN0KCkpIHtcbiAgICAgIGxldCB2YWx1ZSA9IGF3YWl0IHRoaXMuZ2V0KGtleSk7XG4gICAgICBvdXRwdXRba2V5XSA9IHZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0O1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGVudGlyZSBkYXRhYmFzZSB0aHJvdWdoIGFuIG9iamVjdC5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0LlxuICAgKi9cbiAgYXN5bmMgc2V0QWxsKG9iajogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBvYmopIHtcbiAgICAgIGxldCB2YWwgPSBvYmpba2V5XTtcbiAgICAgIGF3YWl0IHRoaXMuc2V0KGtleSwgdmFsKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogRGVsZXRlIG11bHRpcGxlIGVudHJpZXMgYnkga2V5c1xuICAgKiBAcGFyYW0ge0FycmF5PHN0cmluZz59IGFyZ3MgS2V5c1xuICAgKi9cbiAgYXN5bmMgZGVsZXRlTXVsdGlwbGUoLi4uYXJnczogc3RyaW5nW10pIHtcbiAgICBjb25zdCBwcm9taXNlcyA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBhcmcgb2YgYXJncykge1xuICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLmRlbGV0ZShhcmcpKTtcbiAgICB9XG5cbiAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sTUFBTSxNQUFNO0lBQ2pCOzs7S0FHRyxDQUNILEdBQUcsQ0FBUztJQUNaLFlBQVksR0FBWSxDQUFFO1FBQ3hCLElBQUksR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FB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