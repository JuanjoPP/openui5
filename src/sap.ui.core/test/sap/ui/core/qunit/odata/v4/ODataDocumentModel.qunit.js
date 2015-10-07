/*!
 * ${copyright}
 */
sap.ui.require([
	"sap/ui/model/odata/v4/_OlingoDocument",
	"sap/ui/model/odata/v4/ODataDocumentModel",
	"sap/ui/test/TestUtils"
], function (OlingoDocument, ODataDocumentModel, TestUtils) {
	"use strict";
	/*global QUnit, sinon */
	/*eslint no-warning-comments: 0 */

	/*
	 * You can run various tests in this module against a real OData v4 service using the request
	 * property "realOData". See src/sap/ui/test/TestUtils.js for details.
	 */

	var mFixture = {
			"/sap/opu/local_v4/IWBEP/TEA_BUSI/$metadata": {source: "metadata.xml"},
			"/foo/$metadata": {code: 404}
		},
		sDocumentUrl = "/sap/opu/local_v4/IWBEP/TEA_BUSI/$metadata";

	/**
	 * Returns a resolved promised for the given object. Clones the object.
	 *
	 * @param {object} o
	 *   the object
	 * @return {Promise}
	 *   the promised to be resolved with a clone of the object
	 */
	function promiseFor(o) {
		return Promise.resolve(JSON.parse(JSON.stringify(o)));
	}

	//*********************************************************************************************
	QUnit.module("sap.ui.model.odata.v4.ODataDocumentModel", {
		beforeEach : function () {
			this.oSandbox = sinon.sandbox.create();
			TestUtils.setupODataV4Server(this.oSandbox, mFixture);
			this.oLogMock = this.oSandbox.mock(jQuery.sap.log);
			this.oLogMock.expects("warning").never();
			this.oLogMock.expects("error").never();

			this.oDocumentModel = new ODataDocumentModel(TestUtils.proxy(sDocumentUrl));
		},

		afterEach : function () {
			sap.ui.getCore().getConfiguration().setLanguage(this.sDefaultLanguage);
			this.oSandbox.verifyAndRestore();
		},

		sDefaultLanguage : sap.ui.getCore().getConfiguration().getLanguage()
	});

	//*********************************************************************************************
	QUnit.test("read: /EntityContainer", function (assert) {
		var sPath = "/EntityContainer?$expand=EntitySets,Singletons",
			oEntityContainer = {
				"QualifiedName" : "com.sap.gateway.iwbep.tea_busi.v0001.Container"
			};

		this.oSandbox.mock(OlingoDocument).expects("transformEntityContainer")
			.withExactArgs(sinon.match.object).returns(promiseFor(oEntityContainer));

		return this.oDocumentModel.read(sPath).then(function (oResult) {
			assert.deepEqual(oResult, oEntityContainer);
		});
	});

	//*********************************************************************************************
	QUnit.test("read entity type via /Types", function (assert) {
		var sEntityTypeName = "com.sap.gateway.iwbep.tea_busi.v0001.Worker",
			sPath = "/Types(QualifiedName='" + sEntityTypeName
				+ "')?$expand=Properties/Type($level=max),NavigationProperties",
			oEntityType = {
				"QualifiedName" : sEntityTypeName
			};

		this.oSandbox.mock(OlingoDocument).expects("transformEntityType")
			.withExactArgs(sinon.match.object, sEntityTypeName)
			.returns(promiseFor(oEntityType));

		return this.oDocumentModel.read(sPath).then(function (oResult) {
			assert.deepEqual(oResult, oEntityType);
		});
	});

	//*********************************************************************************************
	[
		"/",
		"/Types",
		"/Types(Name='Worker')",
		"/EntityContainer(Foo='Bar')",
		"/EntityContainer/EntitySets",
		"/EntitySets(Name='EMPLOYEES')"
	].forEach(function (sPath) {
		QUnit.test("read:" + sPath, function (assert) {
			return this.oDocumentModel.read(sPath).then(function () {
				assert.ok(false, "unexpected success");
			})["catch"](function (oError) {
				assert.strictEqual(oError.message, "Unsupported: " + sPath);
			});
		});
	});
	// TODO Singleton:
	// 	<NavigationProperty Name="NavigationPropertyBindings" Type="Collection(Edm.Metadata.NavigationPropertyBinding)" Partner="Source" />
	// 	<NavigationProperty Name="EntityContainer" Type="Edm.Metadata.EntityContainer" Nullable="false" Partner="Singletons" />
	// 	<NavigationProperty Name="Annotations" Type="Collection(Edm.Metadata.Annotation)" Partner="Target" />
});
