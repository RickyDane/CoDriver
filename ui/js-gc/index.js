(function(){
	yielded = (function(){
		if (typeof require === "function") {
			try {
				require("v8").setFlagsFromString('--expose_gc');
				if (global!=null) {
					if (typeof global.gc =="function") {
						return global.gc
					}
				}
				var vm = require("vm");
				if (vm!=null) {
					if (typeof vm.runInNewContext =="function") {
						var k = vm.runInNewContext("gc");
						return function(){
							k();
							return;
						};
					}
				}
			} catch (e) {}
		
		}
		if (typeof window !== 'undefined') {
			if (window.CollectGarbage) {
				return window.CollectGarbage;
			}
			if (window.gc) {
				return window.gc;
			}
			if (window.opera) {
				if (window.opera.collect) {
					return window.opera.collect;
				}
			}
			if (window.QueryInterface) {
				return window.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindowUtils).garbageCollect;
			}
		}
		if (typeof ProfilerAgent !== 'undefined') {
			if (ProfilerAgent.collectGarbage) {
				return ProfilerAgent.collectGarbage;
			}
		}
		if (typeof global !== 'undefined') {
			if (global.gc) {
				return global.gc;
			}
		}
		if (typeof Duktape == 'object') {
			if (typeof Duktape.gc) {
				return Duktape.gc;
			}
		}
		if (typeof Packages !=='undefined') {
			if (typeof Packages.java !=='undefined') {
				if (Packages.java.lang) {
					if (Packages.java.lang) {
						if (Packages.java.lang.System) {
							return Packages.java.lang.System.gc;
						}
					}
				}
			}
		}
		if (typeof java !=='undefined') {
			if (java.lang) {
				if (java.lang) {
					if (java.lang.System) {
						return java.lang.System.gc;
					}
				}
			}
		}
		if (typeof Java !=='undefined') {
			if (java.type) {
				return Java.type('java.lang.System').gc;
			}
		}
		if (typeof CollectGarbage=="function") {
			return CollectGarbage;
		}
		if (typeof jerry_gc=="function") {
			return jerry_gc;
		}
		return function(){};
	})();
	if ((typeof window)=='object') {
		window.gc = yielded;
	}
	if ((typeof module)=='object') {
		module.exports = exports = yielded;
	}
	if ((typeof define)=='function' && define.amd) {
		define("gc",[], function(){
			return yielded;
		});
	}
	/*
	if ((function(){
		try {
			eval ('var export = 1;');
		} catch (e) {
			return true;
		}
		return false;
	})()) {
		eval('export const gc = yielded;');
	}*/
	return yielded;
})();