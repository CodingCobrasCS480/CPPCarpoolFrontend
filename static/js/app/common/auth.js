var auth = angular.module('app.common.auth', []);

auth.factory('authFactory', ['$rootScope', '$injector', function($rootScope, $injector) {
    var authFactory = {};
    var token = "";
    var user = {};

    if (typeof localStorage !== "undefined" && typeof localStorage.authToken !== "undefined") {
        token = localStorage.authToken;
    }

    authFactory.getUser = function() {
        return user;
    };

    authFactory.setUser = function (u) {
        user = u;
        $rootScope.$emit('userChange');
    };

    authFactory.getToken = function() {
        return token;
    };

    authFactory.setToken = function(t) {
        token = t;
        if (typeof localStorage !== "undefined") {
            localStorage.authToken = token;
        }
        $rootScope.$emit('tokenChange');
    };

    authFactory.loggedIn = function() {
        return token.length > 0;
    };

    authFactory.logout = function() {
        user = {};
        token = "";
        delete localStorage.authToken;
        $rootScope.$emit('logout');
        $rootScope.$emit('userChange');
    };

    return authFactory;
}]);

auth.factory('authHttpInterceptor', ['$q', 'authFactory', function($q, authFactory) {
        var interceptor = {};

        interceptor.request = function(config) {
            if (config.noAuth) {
                return config;
            }

            config.headers = config.headers || {};
            if (authFactory.loggedIn()) {
                config.headers.Authorization = 'Bearer ' + authFactory.getToken();
            }

            return config;
        };

        interceptor.response = function(response) {
            var renew = response.headers("renew-token");
            if (renew) {
                authFactory.setToken(renew);
            }

            return response;
        };

        interceptor.responseError = function(response) {
            if (authFactory.loggedIn() && (response.status == 401 || response.status == 403)) {
                authFactory.logout();
            }

            return $q.reject(response);
        };

        return interceptor;
}]);

auth.config(['$httpProvider', function ($httpProvider) {
    $httpProvider.interceptors.push('authHttpInterceptor');
}]);

auth.run(['authFactory', '$http', function(authFactory, $http) {
    // try to fetch user info from server
    if (authFactory.loggedIn()) {
        $http({
            'url': '/api/user/',
            'method': 'GET'
        }).then(function(response) {
            authFactory.setUser(response.data);
        }, function(response) {
            authFactory.logout();
        });
    }
}]);
